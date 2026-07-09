#!/bin/bash
set -e

INGEST_BUCKET="s3://land-data"
GRANTS_CONFIG_BROKER_BUCKET="s3://configs-bucket"

AWS_REGION=${AWS_REGION:-eu-west-2}

echo "Waiting for floci to be ready..."
until aws s3 ls 2>/dev/null; do
  echo "Waiting..."
  sleep 2
done

echo "Creating S3 bucket"
aws s3 mb ${INGEST_BUCKET}
echo "Created S3 bucket: ${INGEST_BUCKET}"

echo "Creating grants-config-broker S3 bucket"
aws s3 mb ${GRANTS_CONFIG_BROKER_BUCKET}
echo "Created grants-config-broker S3 bucket: ${GRANTS_CONFIG_BROKER_BUCKET}"

echo "Creating grants-config-broker SQS queue"
aws sqs create-queue --queue-name grants_config_broker_update
echo "Created SQS queue: grants_config_broker_update"

echo "Creating grants-config-broker SNS topic"
aws sns create-topic --name gfr__sns___config_update
echo "Created SNS topic: gfr__sns___config_update"

echo "Subscribing SQS queue to SNS topic (raw delivery)"
aws sns subscribe \
  --topic-arn arn:aws:sns:${AWS_REGION}:000000000000:gfr__sns___config_update \
  --protocol sqs \
  --attributes RawMessageDelivery=true \
  --notification-endpoint arn:aws:sqs:${AWS_REGION}:000000000000:grants_config_broker_update
echo "Subscribed grants_config_broker_update to gfr__sns___config_update"

echo "Creating audit event SNS topic"
aws sns create-topic --name fcp_audit_land_grants_api
echo "Created SNS topic: fcp_audit_land_grants_api"
