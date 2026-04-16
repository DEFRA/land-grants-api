#!/bin/bash
set -e

INGEST_BUCKET="s3://land-data"

AWS_REGION=${AWS_REGION:-eu-west-2}

echo "Waiting for floci to be ready..."
until aws s3 ls 2>/dev/null; do
  echo "Waiting..."
  sleep 2
done

echo "Creating S3 bucket"
aws s3 mb ${INGEST_BUCKET}
echo "Created S3 bucket: ${INGEST_BUCKET}"