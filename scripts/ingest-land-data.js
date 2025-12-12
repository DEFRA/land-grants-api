import fs from 'fs'
import path from 'path'

// Important: configure these values for the ingestion
const environment = 'prod'
const clientId = process.env.CLIENT_ID
const clientSecret = process.env.CLIENT_SECRET

// The script expects folders named after each resource under scripts/ingestion-data/data/
const resources = [
  'agreements',
  'compatibility_matrix',
  'moorland',
  'parcels',
  'covers'
]

const CONFIG = {
  dev: {
    cdpUrl: 'https://cdp-uploader.dev.cdp-int.defra.cloud',
    apiBaseUrl: 'https://land-grants-api.api.dev.cdp-int.defra.cloud',
    tokenUrl:
      'https://land-grants-api-c63f2.auth.eu-west-2.amazoncognito.com/oauth2/token'
  },
  test: {
    cdpUrl: 'https://cdp-uploader.test.cdp-int.defra.cloud',
    apiBaseUrl: 'https://land-grants-api.api.test.cdp-int.defra.cloud',
    tokenUrl:
      'https://land-grants-api-6bf3a.auth.eu-west-2.amazoncognito.com/oauth2/token'
  },
  'perf-test': {
    cdpUrl: 'https://cdp-uploader.perf-test.cdp-int.defra.cloud',
    apiBaseUrl: 'https://land-grants-api.api.perf-test.cdp-int.defra.cloud',
    tokenUrl:
      'https://land-grants-api-05244.auth.eu-west-2.amazoncognito.com/oauth2/token'
  },
  prod: {
    cdpUrl: 'https://cdp-uploader.prod.cdp-int.defra.cloud',
    apiBaseUrl: 'https://land-grants-api.api.prod.cdp-int.defra.cloud',
    tokenUrl:
      'https://land-grants-api-75ee2.auth.eu-west-2.amazoncognito.com/oauth2/token'
  }
}

async function transferAllResources() {
  for (const resource of resources) {
    try {
      await transferResource(resource)
    } catch (error) {
      console.error(`✗ Unhandled error: ${error.message}`)
      process.exit(1)
    }
  }
}

/**
 * Get config value for the given environment and key
 * @param {string} env - Environment name
 * @param {string} key - Config key (apiBaseUrl or tokenUrl)
 * @returns {string} Config value
 */
function getConfigValue(env, key) {
  const config = CONFIG[env]
  if (!config) {
    throw new Error(`Invalid environment: ${env}`)
  }
  return config[key]
}

/**
 * Get Cognito access token using client credentials
 * @param {string} clientId - Cognito client ID
 * @param {string} clientSecret - Cognito client secret
 * @param {string} environment - Environment name
 * @returns {Promise<string>} Access token
 */
async function getCognitoToken(clientId, clientSecret, environment) {
  try {
    const tokenUrl = getConfigValue(environment, 'tokenUrl')
    console.log(`✓ Getting Cognito token from ${tokenUrl}`)

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64'
    )

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`
      },
      body: 'grant_type=client_credentials'
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Error: HTTP ${response.status}\n${body}`)
    }

    const data = await response.json()
    return data.access_token
  } catch (error) {
    console.log(`✗ Get Cognito token failed - ${error}`)
    throw error
  }
}

/**
 * Make POST request to API with authentication
 * @param {object} jsonData - JSON payload
 * @param {string} accessToken - Bearer token
 * @param {string} environment - Environment name
 * @returns {Promise<object>} Response body
 */
async function initiateLandDataUpload(jsonData, accessToken, environment) {
  try {
    const apiBaseUrl = getConfigValue(environment, 'apiBaseUrl')
    console.log(
      `✓ Initiating land data upload to ${apiBaseUrl}/initiate-upload`
    )

    const response = await fetch(`${apiBaseUrl}/initiate-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(jsonData)
    })

    if (!response.ok) {
      console.log(
        `✗ Failed - Check if API is running at ${apiBaseUrl} - HTTP ${response.status}`
      )
      throw new Error(
        `Failed to initiate land data upload - HTTP ${response.status}`
      )
    }

    return await response.json()
  } catch (error) {
    console.log(`✗ Failed to initiate land data upload - ${error.message}`)
    throw error
  }
}

async function checkUploadStatus(uploadId, accessToken, environment) {
  try {
    const apiBaseUrl = getConfigValue(environment, 'cdpUrl')
    console.log(
      `✓ Getting CDP Uploader status from ${apiBaseUrl}/status/${uploadId}`
    )

    const response = await fetch(`${apiBaseUrl}/status/${uploadId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })
    if (!response.ok) {
      console.log(`✗ Failed to check upload status - HTTP ${response.status}`)
      throw new Error(`Failed to check upload status - HTTP ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.log(`✗ Failed to check upload status - ${error}`)
    throw error
  }
}

/**
 * Upload file to endpoint with authentication
 * @param {string} uploadUrl - Upload URL
 * @param {string} filePath - Path to file to upload
 * @param {string} accessToken - Bearer token
 * @returns {Promise<void>}
 */
async function uploadFileToS3(uploadUrl, filePath, accessToken) {
  try {
    console.log(`✓ Uploading file to S3 ${uploadUrl}`)
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const fileName = path.basename(filePath)

    await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'content-type': 'text/csv',
        'x-filename': fileName
      },
      body: fileContent,
      redirect: 'manual'
    })
  } catch (error) {
    console.log(`✗ Failed to upload file to S3 - ${error}`)
    throw error
  }
}

/**
 * Main function to run the ingestion process
 */
async function transferResource(resource) {
  console.log(`\n=== Starting ingestion for resource: ${resource} ===`)

  const ingestionDataDirectory = path.join(
    process.cwd(),
    'ingestion-data/data/' + resource
  )

  if (!clientId || !clientSecret) {
    throw new Error('CLIENT_ID and CLIENT_SECRET must be set')
  }

  console.log(
    `Ingestion Details: ${JSON.stringify(
      {
        resource,
        environment,
        clientId,
        clientSecret,
        ingestionDataDirectory
      },
      null,
      2
    )}`
  )

  // metadata for the ingestion, to identify who by and when the ingestion was performed
  const reference = new Date().toISOString().replace('T', ':').slice(0, 19)
  const customerId = 'DEV_TEAM'

  // get the access token from cognito
  const accessToken = await getCognitoToken(clientId, clientSecret, environment)
  console.log(`${accessToken !== undefined ? '✓' : '✗'} Access token retrieved`)

  // get the files to ingest from the directory
  const files = fs.readdirSync(ingestionDataDirectory)
  console.log(`✓ ${files.length} files to ingest found`)

  // iterate over the files and ingest them
  for (const landDataFile of files) {
    console.log(`✓ Start ingesting ${landDataFile}`)

    //reject files that do not contain .csv extension
    if (!landDataFile.endsWith('.csv')) {
      console.log(`✗ Skipping ${landDataFile} as it does not end with .csv`)
      continue
    }

    const initiateUploadResponse = await initiateLandDataUpload(
      {
        reference,
        customerId,
        resource
      },
      accessToken,
      environment
    )

    console.log(`✓ Initiate upload successful for ${landDataFile}`)

    // Upload the file to S3
    await uploadFileToS3(
      initiateUploadResponse.uploadUrl,
      path.join(ingestionDataDirectory, landDataFile),
      accessToken
    )

    // Check the upload status, should be pending
    const uploadStatusResponse = await checkUploadStatus(
      initiateUploadResponse.uploadUrl.split('/').pop(),
      accessToken,
      environment
    )

    if (uploadStatusResponse.uploadStatus === 'pending') {
      console.log(
        `✓ File upload successful and ${uploadStatusResponse.uploadStatus} status for ${landDataFile}`
      )
    } else {
      console.log(`✗ Upload status is not pending for ${landDataFile}`)
      throw new Error(`Upload status is not pending`)
    }
  }

  console.log('✓ Ingestion complete for : ' + resource)
}

transferAllResources()
