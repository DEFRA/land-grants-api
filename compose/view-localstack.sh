#!/usr/bin/env bash
set -euo pipefail

# Lists SNS topics, SNS subscriptions (notifications), and SQS queues from LocalStack

# Endpoint and credentials defaults for LocalStack
export ENDPOINT="${ENDPOINT:-http://localhost:4566}"
export AWS_REGION="${AWS_REGION:-eu-west-2}"
export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-$AWS_REGION}"
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Options:
  -h, --help           Show this help

Environment overrides:
  ENDPOINT              Default: http://localhost:4566
  AWS_REGION            Default: eu-west-2
  AWS_DEFAULT_REGION    Default: eu-west-2
  AWS_ACCESS_KEY_ID     Default: test
  AWS_SECRET_ACCESS_KEY Default: test
EOF
}

for arg in "$@"; do
  case "$arg" in
    -h|--help)
      usage
      exit 0
      ;;

    *)
      ;;
  esac
done

# Prefer local awslocal if installed; otherwise, if using localhost and the
# LocalStack container is available, exec into it; else fall back to aws.
if command -v awslocal >/dev/null 2>&1; then
  AWS_BIN=(awslocal)
  CLI_LABEL="awslocal"
elif [[ "$ENDPOINT" =~ ^http://localhost(:[0-9]+)?$ ]] \
  && command -v docker >/dev/null 2>&1 \
  && docker ps --format '{{.Names}}' | grep -q '^localstack$'; then
  AWS_BIN=(docker exec \
    -e AWS_REGION="${AWS_REGION}" \
    -e AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION}" \
    -e AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
    -e AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
    localstack awslocal)
  CLI_LABEL="docker exec localstack awslocal"
else
  AWS_BIN=(aws --endpoint-url "$ENDPOINT")
  CLI_LABEL="aws --endpoint-url $ENDPOINT"
fi

run() {
  "${AWS_BIN[@]}" "$@"
}

echo "LocalStack endpoint: $ENDPOINT"
echo "AWS region:          $AWS_REGION"
echo "Using CLI:           $CLI_LABEL"
echo

echo "=== SNS Topics ==="
run sns list-topics --output table || true
echo

echo "=== SNS Subscriptions ==="
run sns list-subscriptions \
  --query 'Subscriptions[*].[SubscriptionArn,TopicArn,Protocol,Endpoint]' \
  --output table || true
echo

echo "=== SQS Queues ==="
run sqs list-queues --output table || true
echo

# Detailed attributes per queue (if any)
QUEUE_URLS=$(run sqs list-queues --query 'QueueUrls' --output text 2>/dev/null || true)
if [[ -n "${QUEUE_URLS}" ]]; then
  echo "=== SQS Queue Attributes ==="
  for url in ${QUEUE_URLS}; do
    echo "- ${url}"
    run sqs get-queue-attributes \
      --queue-url "${url}" \
      --attribute-names QueueArn ApproximateNumberOfMessages ApproximateNumberOfMessagesNotVisible RedrivePolicy \
      --query 'Attributes' \
      --output table || true

    echo "  Messages (up to 10):"
    MESSAGES=$(run sqs receive-message \
      --queue-url "${url}" \
      --max-number-of-messages 10 \
      --visibility-timeout 0 \
        --wait-time-seconds 0 \
        --attribute-names All \
        --message-attribute-names All \
        --output json 2>/dev/null || true)
    if command -v jq >/dev/null 2>&1; then
      echo "${MESSAGES}" | jq -r '.Messages // [] | .[] | {MessageId, ReceiptHandle, Attributes, MessageAttributes, Body}'
    else
      echo "${MESSAGES}"
    fi
  done
  echo
fi

# Subscriptions grouped by topic (if any)
TOPIC_ARNS=$(run sns list-topics --query 'Topics[].TopicArn' --output text 2>/dev/null || true)
if [[ -n "${TOPIC_ARNS}" ]]; then
  echo "=== Subscriptions by Topic ==="
  for arn in ${TOPIC_ARNS}; do
    # Validate the topic before listing subscriptions to avoid NotFound errors
    if run sns get-topic-attributes --topic-arn "${arn}" >/dev/null 2>&1; then
      echo "- ${arn}"
      run sns list-subscriptions-by-topic \
        --topic-arn "${arn}" \
        --query 'Subscriptions[*].[SubscriptionArn,Protocol,Endpoint]' \
        --output table 2>/dev/null || true
    else
      echo "- ${arn} (not found)"
    fi
  done
fi


