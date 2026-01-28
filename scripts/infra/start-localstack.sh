#!/bin/bash
set -e

INGEST_BUCKET="s3://land-data"

echo "Creating S3 bucket"

# Create S3 bucket
awslocal --endpoint-url=$AWS_ENDPOINT s3 mb ${INGEST_BUCKET}
echo "Created S3 bucket: ${INGEST_BUCKET}"

echo "S3 bucket created"
