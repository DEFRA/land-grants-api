#!/bin/bash
# Starts the grants-config-broker against the land-grants-api's LocalStack (floci) to test the
# end-to-end flow: grants-config-broker → SNS → SQS → land-grants-api.
#
# Prerequisites: land-grants-api stack must be running (docker compose up floci floci-init ... -d).
set -euo pipefail

export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_REGION=eu-west-2
export AWS_ENDPOINT_URL=http://localhost:4566

# Sibling repos are resolved from this script's location, so it can be run from any directory.
# Both layouts are supported, the first match wins:
#   <workspace>/land-grants-api              next to <workspace>/grants-config-broker
#   <workspace>/land-grants/land-grants-api  with   <workspace>/grants-config-broker
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
if [[ ! -d "$WORKSPACE_DIR/grants-config-broker" && -d "$WORKSPACE_DIR/../grants-config-broker" ]]; then
  WORKSPACE_DIR="$(cd "$WORKSPACE_DIR/.." && pwd)"
fi
BROKER_DIR="${BROKER_DIR:-$WORKSPACE_DIR/grants-config-broker}"
COMPOSE_FILE="$BROKER_DIR/compose.yml"
GRANT_NAME="land-grants"
GRANT_CONFIG_SOURCE="${GRANT_CONFIG_SOURCE:-$WORKSPACE_DIR/grants-config-land-grants}"
SOURCE_CONFIG_DIR="$GRANT_CONFIG_SOURCE/configurations/$GRANT_NAME"
ELIGIBILITY_FILE="actions/actions_eligibility.csv"
POSTGRES_CONTAINER="land-grants-api-land-grants-backend-postgres-1"
QUEUE_URL="$AWS_ENDPOINT_URL/000000000000/grants_config_broker_update"
RELEASE_TIMEOUT="${RELEASE_TIMEOUT:-120}"

# ---------------------------------------------------------------------------
# Splash / help
# ---------------------------------------------------------------------------

BOLD='\033[1m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RESET='\033[0m'

print_splash() {
  echo -e "${CYAN}"
  echo '  ██████╗ ██████╗  █████╗ ███╗   ██╗████████╗███████╗'
  echo ' ██╔════╝ ██╔══██╗██╔══██╗████╗  ██║╚══██╔══╝██╔════╝'
  echo ' ██║  ███╗██████╔╝███████║██╔██╗ ██║   ██║   ███████╗'
  echo ' ██║   ██║██╔══██╗██╔══██║██║╚██╗██║   ██║   ╚════██║'
  echo ' ╚██████╔╝██║  ██║██║  ██║██║ ╚████║   ██║   ███████║'
  echo '  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝'
  echo -e "${RESET}"
  echo -e "  ${BOLD}config-broker local runner${RESET}  ·  land-grants ↔ LocalStack (floci)"
  echo
}

print_help() {
  print_splash
  echo -e "${BOLD}USAGE${RESET}"
  echo "  $(basename "$0") [subcommand] [arguments]"
  echo
  echo -e "${BOLD}SUBCOMMANDS${RESET}"
  echo -e "  ${GREEN}(no args)${RESET}                                       Start the broker without any config setup"
  echo -e "  ${GREEN}add${RESET} <action-code> <grant-version> <sem-ver> [has-sssi] [has-hf]"
  echo "                                                  Create a new action config, add it to the actions eligibility"
  echo "                                                  CSV (has-sssi/has-hf: 0 or 1, default 1) and start"
  echo -e "  ${GREEN}update${RESET} <action-code> <grant-version> <sem-ver> Republish an existing action with a new semantic version and start"
  echo -e "  ${GREEN}compat${RESET} <grant-version>                         Publish only the compatibility matrix CSV and start"
  echo -e "  ${GREEN}release${RESET} [grant-version]                        Publish the whole grant config (actions, eligibility, compat"
  echo "                                                  matrix), wait for land-grants-api to ingest it, then stop the"
  echo "                                                  broker. Without a version, bumps the patch of the latest one"
  echo "                                                  the broker has released"
  echo -e "  ${GREEN}inspect${RESET} [action-code...]                       Print SQS queues, S3 contents, and DB rows then exit"
  echo -e "  ${GREEN}-h${RESET}, ${GREEN}--help${RESET}                                   Show this help message"
  echo
  echo -e "${BOLD}EXAMPLES${RESET}"
  echo "  $(basename "$0")                            # restart broker, no config changes"
  echo "  $(basename "$0") add TEST1 0.0.5 1.0.0      # publish TEST1 v1.0.0 under grant release 0.0.5"
  echo "  $(basename "$0") add TEST2 0.0.6 1.0.0 1 0  # publish TEST2, SSSI eligible but not HF eligible"
  echo "  $(basename "$0") update PA3 0.0.6 2.0.0     # republish PA3 with semanticVersion 2.0.0"
  echo "  $(basename "$0") update HEF1 0.0.7 1.2.0    # republish HEF1 with semanticVersion 1.2.0"
  echo "  $(basename "$0") compat 0.0.8               # publish the compatibility matrix under grant release 0.0.8"
  echo "  $(basename "$0") release                    # seed the local DB with the whole grant config"
  echo "  $(basename "$0") inspect HEF1               # inspect current LocalStack (floci) + DB state"
  echo
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

require_semver() {
  local label="$1" value="$2"
  if [[ ! "$value" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo -e "${BOLD}Error:${RESET} $label must look like 1.2.3, got '$value'" >&2
    exit 1
  fi
}

require_dir() {
  if [[ ! -d "$1" ]]; then
    echo -e "${BOLD}Error:${RESET} $2 not found at $1" >&2
    exit 1
  fi
}

make_release_yml() {
  local grant_version="$1"
  require_semver "grant-version" "$grant_version"
  require_dir "$BROKER_DIR" "grants-config-broker (override with BROKER_DIR=...)"
  require_dir "$SOURCE_CONFIG_DIR" "grant config (override with GRANT_CONFIG_SOURCE=...)"
  local config_dir="$BROKER_DIR/config"
  mkdir -p "$config_dir"
  cat > "$config_dir/release.yml" << EOF
name: $GRANT_NAME
version: $grant_version
notes: Local test
environments:
  - name: dev
    status: active
EOF
  echo -e "  ${YELLOW}release.yml${RESET}   $config_dir/release.yml"
}

# Every file under the versioned directory is published, so start it empty
# rather than republishing whatever an earlier run left there.
make_versioned_dir() {
  VERSIONED_DIR="$BROKER_DIR/config/${GRANT_NAME}@$1"
  rm -rf "$VERSIONED_DIR"
  mkdir -p "$VERSIONED_DIR/actions_config" "$VERSIONED_DIR/actions"
}

# Publish the actions eligibility CSV alongside the action configs, as a config
# release does, so land-grants-api creates their actions rows before inserting them.
copy_actions_eligibility() {
  local source_file="$SOURCE_CONFIG_DIR/$ELIGIBILITY_FILE"
  if [[ ! -f "$source_file" ]]; then
    echo -e "${BOLD}Error:${RESET} no actions eligibility file found at $source_file" >&2
    exit 1
  fi
  cp "$source_file" "$VERSIONED_DIR/$ELIGIBILITY_FILE"
}

# Add (or replace) the row for an action code in the published eligibility CSV.
# The synthetic action is measured in hectares, so its sidedness is blank.
set_actions_eligibility_row() {
  local action_code="$1" has_sssi="$2" has_hf="$3"
  local eligibility="$VERSIONED_DIR/$ELIGIBILITY_FILE"
  awk -F, -v code="$action_code" '$1 != code' "$eligibility" > "$eligibility.tmp"
  echo "$action_code,$has_sssi,$has_hf," >> "$eligibility.tmp"
  mv "$eligibility.tmp" "$eligibility"
  echo -e "  ${YELLOW}eligibility${RESET}   $eligibility ($action_code,$has_sssi,$has_hf)"
}

# Publish the compatibility matrix CSV as a config release does
copy_compatibility_matrix() {
  local source_dir="$SOURCE_CONFIG_DIR/compatibility_matrix"
  if ! compgen -G "$source_dir/compatibility_matrix_*.csv" > /dev/null; then
    echo -e "${BOLD}Error:${RESET} no compatibility_matrix_*.csv found in $source_dir" >&2
    exit 1
  fi
  mkdir -p "$VERSIONED_DIR/compatibility_matrix"
  cp "$source_dir"/compatibility_matrix_*.csv "$VERSIONED_DIR/compatibility_matrix/"
  for file in "$VERSIONED_DIR/compatibility_matrix"/*.csv; do
    echo -e "  ${YELLOW}compat matrix${RESET} $file"
  done
}

start_mongodb() {
  docker network create grants-framework 2>/dev/null || true
  docker compose -f "$COMPOSE_FILE" up mongodb -d --wait
}

# Run on port 3002 (land-grants-api uses 3001).
# SERVICE_VERSION uses a timestamp so MongoDB's duplicate-key guard does not
# block repeated restarts.
run_broker() {
  cd "$BROKER_DIR"
  PORT=3002 \
    AWS_ENDPOINT_URL=http://localhost:4566 \
    ENVIRONMENT=dev \
    CONFIG_BUCKET_NAME=configs-bucket \
    MONGO_URI=mongodb://127.0.0.1:27017/ \
    SERVICE_VERSION="local-$(date +%s)" \
    exec npm run dev
}

start_broker() {
  start_mongodb

  echo
  echo -e "  ${BOLD}Starting broker on port 3002 …${RESET}"
  echo

  run_broker
}

# ---------------------------------------------------------------------------
# release helpers
# ---------------------------------------------------------------------------

fail() {
  echo -e "${BOLD}Error:${RESET} $*" >&2
  exit 1
}

mongo_eval() {
  docker compose -f "$COMPOSE_FILE" exec -T mongodb \
    mongosh --quiet grants-config-broker --eval "$1"
}

psql_query() {
  docker exec "$POSTGRES_CONTAINER" psql -U land_grants_api -d land_grants_api "$@"
}

# The broker skips a version it already has in MongoDB, so a release needs a new one:
# the patch after the highest version known to MongoDB or left in the broker's config dir.
next_grant_version() {
  local versions latest major minor patch
  versions="$(mongo_eval "db.getCollection('config-versions').distinct('version', { grant: '$GRANT_NAME' }).forEach(v => print(v))")"
  local dir
  for dir in "$BROKER_DIR/config/${GRANT_NAME}@"*/; do
    [[ -d "$dir" ]] && dir="${dir%/}" && versions+=$'\n'"${dir##*@}"
  done
  latest="$(grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' <<< "$versions" | sort -V | tail -n 1)"
  if [[ -z "$latest" ]]; then
    echo "0.0.1"
    return
  fi
  IFS=. read -r major minor patch <<< "$latest"
  echo "$major.$minor.$((patch + 1))"
}

check_release_prerequisites() {
  require_dir "$BROKER_DIR" "grants-config-broker (override with BROKER_DIR=...)"
  require_dir "$SOURCE_CONFIG_DIR" "grant config (override with GRANT_CONFIG_SOURCE=...)"
  aws s3 ls s3://configs-bucket > /dev/null 2>&1 ||
    fail "floci is not reachable at $AWS_ENDPOINT_URL (docker compose up floci floci-init -d)"
  aws sqs get-queue-attributes --queue-url "$QUEUE_URL" > /dev/null 2>&1 ||
    fail "queue grants_config_broker_update not found (docker compose up floci-init)"
  psql_query -c 'SELECT 1' > /dev/null 2>&1 ||
    fail "postgres container $POSTGRES_CONTAINER is not running (npm run dev:setup)"
}

queue_depth() {
  aws sqs get-queue-attributes --queue-url "$QUEUE_URL" \
    --attribute-names ApproximateNumberOfMessages ApproximateNumberOfMessagesNotVisible \
    --query 'sum([to_number(Attributes.ApproximateNumberOfMessages), to_number(Attributes.ApproximateNumberOfMessagesNotVisible)])' \
    --output text
}

stop_background_broker() {
  if [[ -n "${BROKER_PID:-}" ]] && kill -0 "$BROKER_PID" 2>/dev/null; then
    # The broker runs in its own process group, so this also stops npm's children
    kill -- -"$BROKER_PID" 2>/dev/null || true
    wait "$BROKER_PID" 2>/dev/null || true
  fi
}

# Starts the broker in the background and waits for it to notify clients of the release
publish_release() {
  local grant_version="$1"
  BROKER_LOG="$BROKER_DIR/config/release-${grant_version}.log"

  start_mongodb
  echo
  echo -e "  ${BOLD}Starting broker in the background …${RESET} (log: $BROKER_LOG)"

  trap stop_background_broker EXIT
  # Job control gives the background job its own process group (setsid is not on macOS)
  set -m
  (run_broker) > "$BROKER_LOG" 2>&1 &
  BROKER_PID=$!
  set +m

  local deadline=$((SECONDS + RELEASE_TIMEOUT))
  until grep -q "Deployed version ${GRANT_NAME} @ ${grant_version} successfully" "$BROKER_LOG"; do
    if ! kill -0 "$BROKER_PID" 2>/dev/null; then
      tail -n 30 "$BROKER_LOG" >&2
      fail "the broker exited before releasing ${GRANT_NAME}@${grant_version}"
    fi
    if grep -q "already deployed to S3, and no status change" "$BROKER_LOG"; then
      fail "the broker already has ${GRANT_NAME}@${grant_version}; pick a higher version"
    fi
    ((SECONDS < deadline)) || fail "timed out waiting for the broker to release (see $BROKER_LOG)"
    sleep 2
  done

  # notifyVersion runs after the "Deployed" log line, so wait for the message to reach SQS
  # or for land-grants-api to have taken it already
  sleep 3
  stop_background_broker
  trap - EXIT
  echo -e "  ${GREEN}✓${RESET} broker released ${GRANT_NAME}@${grant_version} and notified SNS"
}

wait_for_ingest() {
  local deadline=$((SECONDS + RELEASE_TIMEOUT)) depth
  echo -e "  ${BOLD}Waiting for land-grants-api to consume the message …${RESET}"
  while depth="$(queue_depth)" && [[ "$depth" != "0" ]]; do
    if ((SECONDS >= deadline)); then
      echo -e "  ${YELLOW}!${RESET} $depth message(s) still on grants_config_broker_update." >&2
      echo "    Start land-grants-api (npm run dev) and it will ingest them." >&2
      exit 1
    fi
    sleep 2
  done
  echo -e "  ${GREEN}✓${RESET} message consumed"
}

print_release_summary() {
  local matrix_file="$1"
  echo
  echo "=== compatibility_matrix ==="
  psql_query -c "SELECT updated_by, type, count(*) FROM compatibility_matrix GROUP BY updated_by, type ORDER BY updated_by, type;"
  echo "=== actions_config ==="
  psql_query -c "SELECT count(DISTINCT code) AS actions, max(last_updated_at) AS last_updated FROM actions_config;"

  if [[ -n "$matrix_file" ]] &&
    [[ "$(psql_query -tAc "SELECT EXISTS (SELECT 1 FROM compatibility_matrix WHERE updated_by = '$matrix_file')")" != "t" ]]; then
    fail "compatibility_matrix has no rows from $matrix_file; check the land-grants-api logs"
  fi
}

# ---------------------------------------------------------------------------
# Subcommands
# ---------------------------------------------------------------------------

case "${1:-}" in

  -h|--help)
    print_help
    exit 0
    ;;

  inspect)
    shift
    ACTION_CODES=("$@")
    if [[ ${#ACTION_CODES[@]} -eq 0 ]]; then
      ACTION_CODES=(PA3 TEST1)
    fi

    print_splash
    echo "=== SQS queues ==="
    aws sqs list-queues | xargs echo

    echo ""
    echo "=== S3 configs-bucket ==="
    aws s3 ls s3://configs-bucket --recursive

    CODES_LIST=$(printf "'%s'," "${ACTION_CODES[@]}")
    CODES_LIST="${CODES_LIST%,}"

    echo ""
    echo "=== actions_config (${ACTION_CODES[*]}) ==="
    docker exec land-grants-api-land-grants-backend-postgres-1 psql \
      -U land_grants_api -d land_grants_api \
      -c "SELECT * FROM actions_config WHERE code IN ($CODES_LIST) ORDER BY code, id;"

    echo ""
    echo "=== actions (${ACTION_CODES[*]}) ==="
    docker exec land-grants-api-land-grants-backend-postgres-1 psql \
      -U land_grants_api -d land_grants_api \
      -c "SELECT * FROM actions WHERE code IN ($CODES_LIST) ORDER BY code;"

    echo ""
    echo "=== compatibility_matrix (rows per ingested file) ==="
    docker exec land-grants-api-land-grants-backend-postgres-1 psql \
      -U land_grants_api -d land_grants_api \
      -c "SELECT updated_by, type, count(*) FROM compatibility_matrix GROUP BY updated_by, type ORDER BY updated_by, type;"

    exit 0
    ;;

  add)
    ACTION_CODE="${2:-}"
    GRANT_VERSION="${3:-}"
    SEMANTIC_VERSION="${4:-}"
    HAS_SSSI="${5:-1}"
    HAS_HF="${6:-1}"
    if [[ -z "$ACTION_CODE" || -z "$GRANT_VERSION" || -z "$SEMANTIC_VERSION" ]]; then
      echo -e "${BOLD}Usage:${RESET} $0 add <action-code> <grant-version> <semantic-version> [has-sssi] [has-hf]" >&2
      exit 1
    fi
    if [[ ! "$HAS_SSSI" =~ ^[01]$ || ! "$HAS_HF" =~ ^[01]$ ]]; then
      echo -e "${BOLD}Error:${RESET} has-sssi and has-hf must be 0 or 1" >&2
      exit 1
    fi
    if [[ -d "$SOURCE_CONFIG_DIR/actions_config/$ACTION_CODE" ]]; then
      echo -e "${BOLD}Error:${RESET} $ACTION_CODE already exists in $SOURCE_CONFIG_DIR/actions_config, use update" >&2
      exit 1
    fi

    require_semver "sem-ver" "$SEMANTIC_VERSION"

    print_splash
    echo -e "  ${BOLD}Mode:${RESET} add ${ACTION_CODE} @ ${SEMANTIC_VERSION} (grant ${GRANT_VERSION})"
    echo

    make_release_yml "$GRANT_VERSION"
    make_versioned_dir "$GRANT_VERSION"

    ACTION_CODE_LOWER=$(echo "$ACTION_CODE" | tr '[:upper:]' '[:lower:]')
    ACTION_FILE="$VERSIONED_DIR/actions_config/$ACTION_CODE/${ACTION_CODE_LOWER}-${SEMANTIC_VERSION}.json"
    mkdir -p "$(dirname "$ACTION_FILE")"
    cat > "$ACTION_FILE" << EOF
{
  "code": "$ACTION_CODE",
  "description": "Local test action $ACTION_CODE",
  "semanticVersion": "$SEMANTIC_VERSION",
  "startDate": "2025-01-01",
  "applicationUnitOfMeasurement": "ha",
  "durationYears": 3,
  "payment": null,
  "landCoverClassCodes": [],
  "rules": [],
  "groupId": null,
  "displayOrder": 0,
  "enabled": true,
  "display": true
}
EOF
    echo -e "  ${YELLOW}action config${RESET} $ACTION_FILE"

    copy_actions_eligibility
    set_actions_eligibility_row "$ACTION_CODE" "$HAS_SSSI" "$HAS_HF"

    start_broker
    ;;

  update)
    ACTION_CODE="${2:-}"
    GRANT_VERSION="${3:-}"
    SEMANTIC_VERSION="${4:-}"
    if [[ -z "$ACTION_CODE" || -z "$GRANT_VERSION" || -z "$SEMANTIC_VERSION" ]]; then
      echo -e "${BOLD}Usage:${RESET} $0 update <action-code> <grant-version> <semantic-version>" >&2
      exit 1
    fi

    require_semver "sem-ver" "$SEMANTIC_VERSION"

    SOURCE_ACTION_DIR="$SOURCE_CONFIG_DIR/actions_config/$ACTION_CODE"
    if [[ ! -d "$SOURCE_ACTION_DIR" ]]; then
      echo -e "${BOLD}Error:${RESET} no config found for $ACTION_CODE at $SOURCE_ACTION_DIR" >&2
      exit 1
    fi

    print_splash
    echo -e "  ${BOLD}Mode:${RESET} update $ACTION_CODE → semanticVersion ${SEMANTIC_VERSION} (grant ${GRANT_VERSION})"
    echo

    make_release_yml "$GRANT_VERSION"
    make_versioned_dir "$GRANT_VERSION"

    mkdir -p "$VERSIONED_DIR/actions_config/$ACTION_CODE"
    cp "$SOURCE_ACTION_DIR/"*.json "$VERSIONED_DIR/actions_config/$ACTION_CODE/"

    find "$VERSIONED_DIR/actions_config/$ACTION_CODE" -name "*.json" | while read -r file; do
      dir=$(dirname "$file")
      basename=$(basename "$file")
      old_version=$(jq -r '.semanticVersion' "$file")
      new_basename="${basename/$old_version/$SEMANTIC_VERSION}"
      jq --arg v "$SEMANTIC_VERSION" '.semanticVersion = $v' "$file" > "$dir/$new_basename"
      [[ "$basename" != "$new_basename" ]] && rm -f "$file"
    done
    echo -e "  ${YELLOW}action config${RESET} $VERSIONED_DIR/actions_config/$ACTION_CODE/ (semanticVersion → $SEMANTIC_VERSION)"

    copy_actions_eligibility
    echo -e "  ${YELLOW}eligibility${RESET}   $VERSIONED_DIR/$ELIGIBILITY_FILE"

    start_broker
    ;;

  compat)
    GRANT_VERSION="${2:-}"
    if [[ -z "$GRANT_VERSION" ]]; then
      echo -e "${BOLD}Usage:${RESET} $0 compat <grant-version>" >&2
      exit 1
    fi

    print_splash
    echo -e "  ${BOLD}Mode:${RESET} compat (grant ${GRANT_VERSION})"
    echo

    make_release_yml "$GRANT_VERSION"
    make_versioned_dir "$GRANT_VERSION"
    copy_compatibility_matrix

    start_broker
    ;;

  release)
    check_release_prerequisites
    start_mongodb > /dev/null 2>&1
    GRANT_VERSION="${2:-$(next_grant_version)}"
    require_semver "grant-version" "$GRANT_VERSION"

    print_splash
    echo -e "  ${BOLD}Mode:${RESET} release ${GRANT_NAME}@${GRANT_VERSION} from $SOURCE_CONFIG_DIR"
    echo

    make_release_yml "$GRANT_VERSION"
    make_versioned_dir "$GRANT_VERSION"
    cp -R "$SOURCE_CONFIG_DIR"/. "$VERSIONED_DIR"/
    echo -e "  ${YELLOW}grant config${RESET}  $VERSIONED_DIR ($(find "$VERSIONED_DIR" -type f | wc -l) files)"

    MATRIX_FILE="$(basename "$(compgen -G "$VERSIONED_DIR/compatibility_matrix/compatibility_matrix_*.csv" | head -n 1)" 2>/dev/null || true)"

    publish_release "$GRANT_VERSION"
    wait_for_ingest
    print_release_summary "$MATRIX_FILE"
    ;;

  "")
    print_splash
    echo -e "  ${BOLD}Mode:${RESET} start only (no config setup)"
    start_broker
    ;;

  *)
    echo -e "${BOLD}Unknown subcommand:${RESET} ${1}" >&2
    echo "Run '$(basename "$0") --help' for usage." >&2
    exit 1
    ;;

esac
