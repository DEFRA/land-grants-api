#!/bin/bash
# Starts the grants-config-broker against the land-grants-api's LocalStack (floci) to test the
# end-to-end flow: grants-config-broker → SNS → SQS → land-grants-api.
#
# Usage:
#   ./scripts/start-config-broker.sh [grant-version] [semantic-version]
#   ./scripts/start-config-broker.sh inspect
#
# Arguments:
#   grant-version     Release version written to config/release.yml (e.g. 0.0.4). Prompted if omitted.
#   semantic-version  Optional. Overrides the semanticVersion field and filename in all action JSON files.
#   inspect           Prints SQS queues, S3 bucket contents, and the actions_config DB rows then exits.
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
GRANT_CONFIG_SOURCE="../land-grants-config/$GRANT_NAME"

# ---------------------------------------------------------------------------
# inspect mode
# ---------------------------------------------------------------------------

if [[ "${1:-}" == "inspect" ]]; then
  echo "=== SQS queues ==="
  aws sqs list-queues |  xargs echo

  echo ""
  echo "=== S3 configs-bucket ==="
  aws s3 ls s3://configs-bucket --recursive

  echo ""
  echo "=== actions_config (PA3) ==="
  docker exec land-grants-api-land-grants-backend-postgres-1 psql \
    -U land_grants_api -d land_grants_api \
    -c "SELECT code, semantic_version, version, is_active FROM actions_config WHERE code = 'PA3' ORDER BY id;"

  exit 0
fi

# ---------------------------------------------------------------------------
# 1. Prepare release
# ---------------------------------------------------------------------------

GRANT_VERSION="${1:-}"
SEMANTIC_VERSION="${2:-}"

if [[ -z "$GRANT_VERSION" ]]; then
  read -rp "Grant version to release (e.g. 0.0.4): " GRANT_VERSION
fi

CONFIG_DIR="$BROKER_DIR/config"
VERSIONED_DIR="$CONFIG_DIR/${GRANT_NAME}@${GRANT_VERSION}"

mkdir -p "$CONFIG_DIR"

cat > "$CONFIG_DIR/release.yml" << EOF
name: $GRANT_NAME
version: $GRANT_VERSION
notes: Local test
environments:
  - name: dev
    status: active
EOF

mkdir -p "$VERSIONED_DIR"
cp -r "$GRANT_CONFIG_SOURCE/." "$VERSIONED_DIR/"

if [[ -n "$SEMANTIC_VERSION" ]]; then
  find "$VERSIONED_DIR" -name "*.json" | while read -r file; do
    dir=$(dirname "$file")
    basename=$(basename "$file")
    old_version=$(jq -r '.semanticVersion' "$file")
    new_basename="${basename/$old_version/$SEMANTIC_VERSION}"
    jq --arg v "$SEMANTIC_VERSION" '.semanticVersion = $v' "$file" > "$dir/$new_basename"
    [[ "$basename" != "$new_basename" ]] && rm -f "$file"
  done
  echo "semanticVersion:  $SEMANTIC_VERSION (content + filenames updated)"
fi

echo "Release manifest: $CONFIG_DIR/release.yml"
echo "Config files:     $VERSIONED_DIR"

# ---------------------------------------------------------------------------
# 2. Start infrastructure
# ---------------------------------------------------------------------------

# Ensure the shared Docker network exists (no-op if already present)
docker network create grants-framework 2>/dev/null || true

# --wait blocks until the LocalStack healthcheck passes.
docker compose -f "$COMPOSE_FILE" up mongodb -d --wait

# ---------------------------------------------------------------------------
# 3. Start the broker
# ---------------------------------------------------------------------------

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
