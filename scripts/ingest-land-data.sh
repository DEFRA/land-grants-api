
#!/bin/bash
# Usage: scripts/ingest-land-data.sh <environment> <client_id> <client_secret>
# Example: scripts/ingest-land-data.sh dev <client_id> <client_secret>
# Example: scripts/ingest-land-data.sh test <client_id> <client_secret>
# Example: scripts/ingest-land-data.sh perf-test <client_id> <client_secret>
# Example: scripts/ingest-land-data.sh prod <client_id> <client_secret>

set -e

# Function to get API base URL
# Usage: get_api_base_url <environment>
# Sets global variables: API_BASE_URL
get_api_base_url() {
    local env="$1"
    case $env in
        dev)
            echo "https://land-grants-api.api.dev.cdp-int.defra.cloud"
            ;;
        test)
            echo "https://land-grants-api.api.test.cdp-int.defra.cloud"
            ;;
        perf-test)
            echo "https://land-grants-api.api.perf-test.cdp-int.defra.cloud"
            ;;
        prod)
            echo "https://land-grants-api.api.prod.cdp-int.defra.cloud"
            ;;
        *)
            echo "Invalid environment"
            return 1
    esac
    return 0
}


# Function to get token URL
# Usage: get_token_url <environment>
# Sets global variables: TOKEN_URL
get_token_url() {
    local env="$1"
    case $env in
        dev)
            echo "https://land-grants-api-c63f2.auth.eu-west-2.amazoncognito.com/oauth2/token"
            ;;
        test)
            echo "https://land-grants-api-6bf3a.auth.eu-west-2.amazoncognito.com/oauth2/token"
            ;;
        perf-test)
            echo "https://land-grants-api-05244.auth.eu-west-2.amazoncognito.com/oauth2/token"
            ;;
        prod)
            echo "https://land-grants-api-75ee2.auth.eu-west-2.amazoncognito.com/oauth2/token"
            ;;
        *)
            echo "Invalid environment"
            return 1
    esac
    return 0
}

# Function to get Cognito token
# Usage: get_cognito_token <client_id> <client_secret> <token_url>
# Sets global variables: ACCESS_TOKEN
get_cognito_token() {
  local client_id="$1"
  local client_secret="$2"
  local token_url="$3"

  # Create base64 encoded credentials
  local client_credentials="${client_id}:${client_secret}"
  local encoded_credentials=$(echo -n "$client_credentials" | base64)

  # Make the POST request
  local response=$(curl -s -w "\n%{http_code}" -X POST "$token_url" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -u "${client_id}:${client_secret}" \
    -d "grant_type=client_credentials")

  # Extract HTTP status code and body
  local http_code=$(echo "$response" | tail -n1)
  local body=$(echo "$response" | sed '$d')

  # Check if request was successful
  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    # Extract access_token from JSON response
    local access_token=$(echo "$body" | grep -o '"access_token":"[^"]*"' | sed 's/"access_token":"\([^"]*\)"/\1/')
    echo "$access_token"
    return 0
  else
    echo "Error: HTTP $http_code" >&2
    echo "$body" >&2
    return 1
  fi
}

# Function to make POST requests to API with authentication
# Usage: postToApi <endpoint_url> <json_data>
# Sets global variables: HTTP_STATUS, HTTP_RESPONSE_BODY
postToApi() {
    local endpoint="$1"
    local json_data="$2"

    local response=$(curl -s -w "\n%{http_code}" -X POST "$endpoint" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
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
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -F "file=@${file_path}")

    # Extract HTTP status code (last line)
    UPLOAD_HTTP_STATUS=$(echo "$response" | tail -n1)

    # Extract response body (everything except last line)
    UPLOAD_RESPONSE_BODY=$(echo "$response" | sed '$d')

    echo "Upload HTTP Status: $UPLOAD_HTTP_STATUS"
    echo "Upload Response Body: $UPLOAD_RESPONSE_BODY"
    echo "----------------------------------------"
}

CLIENT_ID=$2
CLIENT_SECRET=$3

root_dir="${PWD}/ingestion-data"
REFERENCE=$(date +%Y-%m-%d:%H:%M:%S)
CUSTOMER_ID="ETL"
RESOURCE="parcels"
DATA_DIR="${root_dir}/data"

TOKEN_URL=$(get_token_url "$1")
ACCESS_TOKEN=$(get_cognito_token "$CLIENT_ID" "$CLIENT_SECRET" "$TOKEN_URL")

API_BASE_URL=$(get_api_base_url "$1")
INITIATE_ENDPOINT="${API_BASE_URL}/initiate-upload"

echo ""
echo "----------------------------------------"
echo "Starting ingestion"
echo "----------------------------------------"
echo "Root directory: $root_dir"
echo "Data directory: $DATA_DIR"
echo "API base URL: $API_BASE_URL"
echo "Initiate endpoint: $INITIATE_ENDPOINT"
echo "Reference: $REFERENCE"
echo "Customer ID: $CUSTOMER_ID"
echo "Resource: $RESOURCE"
echo "----------------------------------------"
echo "Ingesting land data"
echo "Reading files from: $DATA_DIR"
echo "Token URL: $TOKEN_URL"
echo "Access Token: $ACCESS_TOKEN"

for land_data_file in "${DATA_DIR}"/land_data_*; do
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
