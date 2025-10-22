#!/bin/bash
set -e

S3_BUCKET="s3://land-data"

echo "Creating S3 bucket"

# Create S3 bucket
awslocal --endpoint-url=$AWS_ENDPOINT s3 mb ${S3_BUCKET}
echo "Created S3 bucket: ${S3_BUCKET}"

echo "S3 bucket created"
