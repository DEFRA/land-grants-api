import 'dotenv/config'
import convict from 'convict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const isProduction = process.env.NODE_ENV === 'production'
const isDev = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'
const config = convict({
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test'],
    default: 'development',
    env: 'NODE_ENV'
  },
  port: {
    doc: 'The port to bind.',
    format: 'port',
    default: 3001,
    env: 'PORT'
  },
  serviceName: {
    doc: 'Api Service Name',
    format: String,
    default: 'land-grants-api'
  },
  root: {
    doc: 'Project root',
    format: String,
    default: path.resolve(dirname, '../..')
  },
  isProduction: {
    doc: 'If this application running in the production environment',
    format: Boolean,
    default: isProduction
  },
  isDevelopment: {
    doc: 'If this application running in the development environment',
    format: Boolean,
    default: isDev
  },
  isTest: {
    doc: 'If this application running in the test environment',
    format: Boolean,
    default: isTest
  },
  log: {
    enabled: {
      doc: 'Is logging enabled',
      format: Boolean,
      default: !isTest,
      env: 'LOG_ENABLED'
    },
    level: {
      doc: 'Logging level',
      format: ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'],
      default: 'info',
      env: 'LOG_LEVEL'
    },
    format: {
      doc: 'Format to output logs in.',
      format: ['ecs', 'pino-pretty'],
      default: isProduction ? 'ecs' : 'pino-pretty',
      env: 'LOG_FORMAT'
    }
  },
  mongoUri: {
    doc: 'URI for mongodb',
    format: '*',
    default: 'mongodb://127.0.0.1:27017/',
    env: 'MONGO_URI'
  },
  mongoDatabase: {
    doc: 'database for mongodb',
    format: String,
    default: 'land-grants-api',
    env: 'MONGO_DATABASE'
  },
  httpProxy: {
    doc: 'HTTP Proxy',
    format: String,
    nullable: true,
    default: null,
    env: 'CDP_HTTP_PROXY'
  },
  httpsProxy: {
    doc: 'HTTPS Proxy',
    format: String,
    nullable: true,
    default: null,
    env: 'CDP_HTTPS_PROXY'
  },
  isSecureContextEnabled: {
    doc: 'Enable Secure Context',
    format: Boolean,
    default: isProduction,
    env: 'ENABLE_SECURE_CONTEXT'
  },
  isMetricsEnabled: {
    doc: 'Enable metrics reporting',
    format: Boolean,
    default: isProduction,
    env: 'ENABLE_METRICS'
  },
  crm: {
    baseUri: {
      doc: 'The Base URI for the CRM tool',
      format: String,
      default: 'http://changeme',
      env: 'CRM_API_BASE_URI'
    },
    username: {
      doc: 'The CRM tool API Username',
      format: String,
      default: 'changeme',
      env: 'CRM_API_USERNAME'
    },
    password: {
      doc: 'The CRM tool API Password',
      format: String,
      default: 'changeme',
      env: 'CRM_API_PASSWORD'
    }
  },
  arcGis: {
    client_id: {
      doc: 'The client ID for ArcGIS in order to establish a token',
      format: String,
      default: 'changeme',
      env: 'ARCGIS_CLIENT_ID',
      sensitive: true
    },
    client_secret: {
      doc: 'The client secret for ArcGIS in order to establish a token',
      format: String,
      default: 'changeme',
      env: 'ARCGIS_CLIENT_SECRET'
    },
    grant_type: {
      doc: 'The ArcGIS permissions to be granted with the token',
      format: String,
      default: 'client_credentials',
      env: 'ARCGIS_GRANT_TYPE'
    },
    username: {
      doc: 'The ArcGIS account username to authenticate the old school way',
      format: String,
      default: 'changeme',
      env: 'ARCGIS_USERNAME'
    },
    password: {
      doc: 'The ArcGIS account password to authenticate the old school way',
      format: String,
      default: 'changeme',
      env: 'ARCGIS_PASSWORD'
    }
  }
})

config.validate({ allowed: 'strict' })

export { config }
