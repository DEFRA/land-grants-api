#!/usr/bin/env bash
# Minimal SQS count monitor for LocalStack (counts only, no receive/delete)
set -euo pipefail

MONITOR_SQS="${MONITOR_SQS:-true}"
QUEUE_NAMES="${QUEUE_NAMES:-agreement_status_updated}"   # comma-separated
INTERVAL="${INTERVAL:-10}"                                     # seconds
ACCOUNT_ID="${ACCOUNT_ID:-000000000000}"

export AWS_REGION="${AWS_REGION:-eu-west-2}"
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"

monitor() {
  IFS=',' read -r -a QUEUES <<<"$QUEUE_NAMES"

  echo "🛰️  Monitoring SQS queues: ${QUEUE_NAMES} (every ${INTERVAL}s)"

  # wait until each queue name appears in list-queues
  wait_for_q() {
    local name="$1"
    while true; do
      if awslocal sqs list-queues --query "QueueUrls[]" --output text 2>/dev/null | grep -q "/${name}\$"; then
        break
      fi
      echo "⏳ Waiting for queue to exist: ${name} ..."
      sleep 2
    done
  }

  # build fixed localhost URLs (avoid bad hosts like sqs.eu-west-2.localstack)
  declare -A QURLS=()
  for q in "${QUEUES[@]}"; do
    wait_for_q "$q"
    QURLS["$q"]="http://localhost:4566/${ACCOUNT_ID}/${q}"
    echo "🔗 $q -> ${QURLS[$q]}"
  done

  while true; do
    echo "---------------------- $(date) ----------------------"
    for q in "${QUEUES[@]}"; do
      qurl="${QURLS[$q]}"
      echo "📬 $q"
      awslocal sqs get-queue-attributes \
        --queue-url "$qurl" \
        --attribute-names ApproximateNumberOfMessages ApproximateNumberOfMessagesNotVisible \
        || echo "⚠️  Could not fetch attributes for $q (will retry)"
    done
    sleep "$INTERVAL"
  done
}

# run in background so READY hook doesn’t block other init scripts
if [ "$MONITOR_SQS" != "true" ]; then
  echo "⏭️ SQS monitor disabled (set MONITOR_SQS=true to enable)"
  exit 0
fi
monitor & disown
echo "✅ SQS monitor started."
