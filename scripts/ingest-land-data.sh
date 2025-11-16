
#!/bin/bash

set -e

root_dir="/Users/airasoul/projects/defra/land-grants-api/ingestion-data"
API_BASE_URL="https://ephemeral-protected.api.dev.cdp-int.defra.cloud/land-grants-api"
INITIATE_ENDPOINT="${API_BASE_URL}/initiate-upload"
REFERENCE=$(date +%Y-%m-%d:%H:%M:%S)
CUSTOMER_ID="ETL"
RESOURCE="parcels"
TEMP_DIR="${root_dir}/data"
TOKEN="Bearer dnJPWFp4VG9SNnR6UGxBTzo0L0xvcWo2OTBHbGZhNXRpT25wL1RnPT06Mnp0SE90NzdDb0dpSWorTk1YZ2luWWZ4V1hhbFJYL0NreWtFWldnOFpOYm1ZSVZXRC83N2ZzTm1XakR1cndHa01sVjVlalpEZm1jY21jN0NzRFJpMGc9PQ=="
API_KEY="XH0VRDAxpN7cRnkMrwh5xY93Y2ug5sTI"

# Function to make POST requests to API with authentication
# Usage: postToApi <endpoint_url> <json_data>
# Sets global variables: HTTP_STATUS, HTTP_RESPONSE_BODY
postToApi() {
    local endpoint="$1"
    local json_data="$2"

    local response=$(curl -s -w "\n%{http_code}" -X POST "$endpoint" \
        -H "Content-Type: application/json" \
        -H "Authorization: $TOKEN" \
        -H "x-api-key: $API_KEY" \
        -d "$json_data")

    # Extract HTTP status code (last line)
    HTTP_STATUS=$(echo "$response" | tail -n1)

    # Extract response body (everything except last line)
    HTTP_RESPONSE_BODY=$(echo "$response" | sed '$d')

    echo "HTTP Status: $HTTP_STATUS"
    echo "HTTP Response Body: $HTTP_RESPONSE_BODY"
    echo "----------------------------------------"
}

# Function to upload file to endpoint with authentication
# Usage: uploadFile <upload_url> <file_path>
# Sets global variables: UPLOAD_HTTP_STATUS, UPLOAD_RESPONSE_BODY
uploadFile() {
    local upload_url="$1"
    local file_path="$2"

    local response=$(curl -s -w "\n%{http_code}" "$upload_url" \
        -H "Authorization: $TOKEN" \
        -H "x-api-key: $API_KEY" \
        -F "file=@${file_path}")

    # Extract HTTP status code (last line)
    UPLOAD_HTTP_STATUS=$(echo "$response" | tail -n1)

    # Extract response body (everything except last line)
    UPLOAD_RESPONSE_BODY=$(echo "$response" | sed '$d')

    echo "Upload HTTP Status: $UPLOAD_HTTP_STATUS"
    echo "Upload Response Body: $UPLOAD_RESPONSE_BODY"
    echo "----------------------------------------"
}

echo ""
echo "----------------------------------------"
echo "Root directory: $root_dir"
echo "API base URL: $API_BASE_URL"
echo "Initiate endpoint: $INITIATE_ENDPOINT"
echo "Reference: $REFERENCE"
echo "Customer ID: $CUSTOMER_ID"
echo "Resource: $RESOURCE"
echo "Temp directory: $TEMP_DIR"
echo "----------------------------------------"
echo "Ingesting land data"
echo "Reading files from: $TEMP_DIR"

for land_data_file in "${TEMP_DIR}"/land_data_*; do
    LAND_DATA_NAME=$(basename "$land_data_file")
    echo "----------------------------------------"
    echo "Uploading ${LAND_DATA_NAME}..."

    # Step 1: Initiate upload and get upload URL
    json_payload="{\"reference\":\"${REFERENCE}\",\"customerId\":\"${CUSTOMER_ID}\",\"resource\":\"${RESOURCE}\"}"
    postToApi "$INITIATE_ENDPOINT" "$json_payload"

    # Check if request was successful
    if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 300 ]; then
        echo "✓ Initiate upload successful"

        # Extract uploadUrl from response
        UPLOAD_URL=$(echo "$HTTP_RESPONSE_BODY" | grep -o '"uploadUrl":"[^"]*"' | sed 's/"uploadUrl":"//;s/"//')

        if [ -z "$UPLOAD_URL" ]; then
            echo "✗ Failed - Could not extract uploadUrl from response"
            continue
        fi

        # Step 2: Upload the file
        uploadFile "$UPLOAD_URL" "$land_data_file"

        # Check if upload was successful (302 redirect is expected success response)
        if [ "$UPLOAD_HTTP_STATUS" -eq 302 ] || ([ "$UPLOAD_HTTP_STATUS" -ge 200 ] && [ "$UPLOAD_HTTP_STATUS" -lt 300 ]); then
            echo "✓ File upload successful"
        else
            echo "✗ File upload failed"
        fi
    else
        echo "✗ Failed - Check if API is running at $API_BASE_URL"
    fi
done


echo "Ingestion complete"
echo "----------------------------------------"
