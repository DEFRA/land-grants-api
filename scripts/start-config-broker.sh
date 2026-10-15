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

BROKER_DIR="../grants-config-broker"
COMPOSE_FILE="$BROKER_DIR/compose.yml"
GRANT_NAME="land-grants"
GRANT_CONFIG_SOURCE="../grants-config-land-grants"
SOURCE_CONFIG_DIR="$GRANT_CONFIG_SOURCE/configurations/$GRANT_NAME"
MAPPING_FILE="actions/actions_mapping.csv"

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
  echo "                                                  Create a new action config, add it to the actions mapping"
  echo "                                                  CSV (has-sssi/has-hf: 0 or 1, default 1) and start"
  echo -e "  ${GREEN}update${RESET} <action-code> <grant-version> <sem-ver> Republish an existing action with a new semantic version and start"
  echo -e "  ${GREEN}inspect${RESET} [action-code...]                       Print SQS queues, S3 contents, and DB rows then exit"
  echo -e "  ${GREEN}-h${RESET}, ${GREEN}--help${RESET}                                   Show this help message"
  echo
  echo -e "${BOLD}EXAMPLES${RESET}"
  echo "  $(basename "$0")                            # restart broker, no config changes"
  echo "  $(basename "$0") add TEST1 0.0.5 1.0.0      # publish TEST1 v1.0.0 under grant release 0.0.5"
  echo "  $(basename "$0") add TEST2 0.0.6 1.0.0 1 0  # publish TEST2, SSSI eligible but not HF eligible"
  echo "  $(basename "$0") update PA3 0.0.6 2.0.0     # republish PA3 with semanticVersion 2.0.0"
  echo "  $(basename "$0") update HEF1 0.0.7 1.2.0    # republish HEF1 with semanticVersion 1.2.0"
  echo "  $(basename "$0") inspect HEF1               # inspect current LocalStack (floci) + DB state"
  echo
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

make_release_yml() {
  local grant_version="$1"
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

# Publish the actions mapping CSV alongside the action configs, as a config
# release does, so land-grants-api applies it after inserting them.
copy_actions_mapping() {
  local source_file="$SOURCE_CONFIG_DIR/$MAPPING_FILE"
  if [[ ! -f "$source_file" ]]; then
    echo -e "${BOLD}Error:${RESET} no actions mapping found at $source_file" >&2
    exit 1
  fi
  cp "$source_file" "$VERSIONED_DIR/$MAPPING_FILE"
}

# Add (or replace) the row for an action code in the published mapping CSV
set_actions_mapping_row() {
  local action_code="$1" has_sssi="$2" has_hf="$3"
  local mapping="$VERSIONED_DIR/$MAPPING_FILE"
  awk -F, -v code="$action_code" '$1 != code' "$mapping" > "$mapping.tmp"
  echo "$action_code,$has_sssi,$has_hf" >> "$mapping.tmp"
  mv "$mapping.tmp" "$mapping"
  echo -e "  ${YELLOW}mapping${RESET}       $mapping ($action_code,$has_sssi,$has_hf)"
}

start_broker() {
  docker network create grants-framework 2>/dev/null || true
  docker compose -f "$COMPOSE_FILE" up mongodb -d --wait

  echo
  echo -e "  ${BOLD}Starting broker on port 3002 …${RESET}"
  echo

  # Run on port 3002 (land-grants-api uses 3001).
  # SERVICE_VERSION uses a timestamp so MongoDB's duplicate-key guard does not
  # block repeated restarts.
  cd "$BROKER_DIR"
  PORT=3002 \
    AWS_ENDPOINT_URL=http://localhost:4566 \
    ENVIRONMENT=dev \
    CONFIG_BUCKET_NAME=configs-bucket \
    MONGO_URI=mongodb://127.0.0.1:27017/ \
    SERVICE_VERSION="local-$(date +%s)" \
    npm run dev
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
      -c "SELECT code, semantic_version, version, is_active, description FROM actions_config WHERE code IN ($CODES_LIST) ORDER BY code, id;"

    echo ""
    echo "=== actions (${ACTION_CODES[*]}) ==="
    docker exec land-grants-api-land-grants-backend-postgres-1 psql \
      -U land_grants_api -d land_grants_api \
      -c "SELECT code, enabled, display, sssi_eligible, hf_eligible, ingest_id, last_updated FROM actions WHERE code IN ($CODES_LIST) ORDER BY code;"

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

    copy_actions_mapping
    set_actions_mapping_row "$ACTION_CODE" "$HAS_SSSI" "$HAS_HF"

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

    copy_actions_mapping
    echo -e "  ${YELLOW}mapping${RESET}       $VERSIONED_DIR/$MAPPING_FILE"

    start_broker
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
