import { config as dotenvConfig } from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Get the directory of this script file
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env from the parent directory (project root)
dotenvConfig({ path: path.join(__dirname, '..', '.env') })

const config = {
  dev: {
    clientId: process.env.CLIENT_ID_DEV || '',
    clientSecret: process.env.CLIENT_SECRET_DEV || '',
    cdpUrl: 'https://cdp-uploader.dev.cdp-int.defra.cloud',
    apiBaseUrl: 'https://land-grants-api.api.dev.cdp-int.defra.cloud',
    tokenUrl:
      'https://land-grants-api-c63f2.auth.eu-west-2.amazoncognito.com/oauth2/token'
  },
  test: {
    clientId: process.env.CLIENT_ID_TEST || '',
    clientSecret: process.env.CLIENT_SECRET_TEST || '',
    cdpUrl: 'https://cdp-uploader.test.cdp-int.defra.cloud',
    apiBaseUrl: 'https://land-grants-api.api.test.cdp-int.defra.cloud',
    tokenUrl:
      'https://land-grants-api-6bf3a.auth.eu-west-2.amazoncognito.com/oauth2/token'
  },
  'perf-test': {
    clientId: process.env.CLIENT_ID_PERF_TEST || '',
    clientSecret: process.env.CLIENT_SECRET_PERF_TEST || '',
    cdpUrl: 'https://cdp-uploader.perf-test.cdp-int.defra.cloud',
    apiBaseUrl: 'https://land-grants-api.api.perf-test.cdp-int.defra.cloud',
    tokenUrl:
      'https://land-grants-api-05244.auth.eu-west-2.amazoncognito.com/oauth2/token'
  },
  'ext-test': {
    clientId: process.env.CLIENT_ID_EXT_TEST || '',
    clientSecret: process.env.CLIENT_SECRET_EXT_TEST || '',
    cdpUrl: 'https://cdp-uploader.ext-test.cdp-int.defra.cloud',
    apiBaseUrl: 'https://land-grants-api.api.ext-test.cdp-int.defra.cloud',
    tokenUrl:
      'https://land-grants-api-8ec5c.auth.eu-west-2.amazoncognito.com/oauth2/token'
  },
  prod: {
    clientId: process.env.CLIENT_ID_PROD || '',
    clientSecret: process.env.CLIENT_SECRET_PROD || '',
    cdpUrl: 'https://cdp-uploader.prod.cdp-int.defra.cloud',
    apiBaseUrl: 'https://land-grants-api.api.prod.cdp-int.defra.cloud',
    tokenUrl:
      'https://land-grants-api-75ee2.auth.eu-west-2.amazoncognito.com/oauth2/token'
  }
}
export { config }
