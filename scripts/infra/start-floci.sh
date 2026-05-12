#!/bin/bash
set -e

INGEST_BUCKET="s3://land-data"
CONFIG_BROKER_BUCKET="s3://dev-grants-config-c63f2"
CONFIG_BROKER_SEED_DIR="/setup/config-broker"

AWS_REGION=${AWS_REGION:-eu-west-2}

echo "Waiting for floci to be ready..."
until aws s3 ls 2>/dev/null; do
  echo "Waiting..."
  sleep 2
done

echo "Deleting all existing S3 buckets in floci"
bucket_names=$(aws s3api list-buckets --query 'Buckets[].Name' --output text 2>/dev/null || true)

if [ -n "${bucket_names}" ]; then
  for bucket in ${bucket_names}; do
    echo "Removing bucket: ${bucket}"
    aws s3 rb "s3://${bucket}" --force
  done
else
  echo "No existing buckets found"
fi

echo "Creating Ingest S3 bucket"
aws s3 mb "${INGEST_BUCKET}"
echo "Created S3 bucket: ${INGEST_BUCKET}"

echo "Creating Config Broker S3 bucket"
aws s3 mb "${CONFIG_BROKER_BUCKET}"
echo "Created S3 bucket: ${CONFIG_BROKER_BUCKET}"

echo "Seeding Config Broker bucket from ${CONFIG_BROKER_SEED_DIR}"
if [ -d "${CONFIG_BROKER_SEED_DIR}" ]; then
  aws s3 cp "${CONFIG_BROKER_SEED_DIR}" "${CONFIG_BROKER_BUCKET}" --recursive --exclude ".DS_Store"
  echo "Synced config files from ${CONFIG_BROKER_SEED_DIR} to ${CONFIG_BROKER_BUCKET}"
else
  echo "Config seed directory not found at ${CONFIG_BROKER_SEED_DIR}; skipping config seed"
fi
