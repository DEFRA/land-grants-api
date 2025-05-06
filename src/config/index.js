import convict from 'convict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const isProduction = process.env.NODE_ENV === 'production'
const isDev = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'
const isLocal = process.env.NODE_ENV === 'local'
const config = convict({
  serviceVersion: {
    doc: 'The service version, this variable is injected into your docker container in CDP environments',
    format: String,
    nullable: true,
    default: null,
    env: 'SERVICE_VERSION'
  },
  env: {
    doc: 'The application environment.',
    format: ['production', 'development', 'test', 'local'],
    default: 'local',
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
  entra: {
    tokenEndpoint: {
      doc: 'Microsoft entra token endpoint',
      format: String,
      default: '',
      env: 'ENTRA_INTERNAL_TOKEN_URL'
    },
    tenantId: {
      doc: 'Microsoft tenant ID',
      format: String,
      default: '',
      env: 'ENTRA_INTERNAL_TENANT_ID'
    },
    clientId: {
      doc: 'Microsoft client ID',
      format: String,
      default: '',
      env: 'ENTRA_INTERNAL_CLIENT_ID'
    },
    clientSecret: {
      doc: 'Microsoft client secret',
      format: String,
      default: '',
      env: 'ENTRA_INTERNAL_CLIENT_SECRET'
    },
    scopeResource: {
      doc: 'Microsoft scope resource url',
      format: String,
      default: '',
      env: 'ENTRA_INTERNAL_SCOPE_RESOURCE'
    }
  },
  landData: {
    dbHost: {
      doc: 'Land Data DB host',
      format: String,
      default: 'localhost',
      env: 'LAND_DATA_DB_HOST'
    },
    dbName: {
      doc: 'Land Data DB name',
      format: String,
      default: 'postgres',
      env: 'LAND_DATA_DB_NAME'
    },
    dbUser: {
      doc: 'Land Data DB username',
      format: String,
      default: 'postgres',
      env: 'LAND_DATA_DB_USERNAME'
    },
    dbPassword: {
      doc: 'Land Data DB password',
      format: String,
      default: 'p0stgr@s',
      env: 'LAND_DATA_DB_PASSWORD'
    }
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
  isLocal: {
    doc: 'If this application running in the local environment',
    format: Boolean,
    default: isLocal,
    env: 'NODE_ENV'
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
    },
    redact: {
      doc: 'Log paths to redact',
      format: Array,
      default: isProduction
        ? ['req.headers.authorization', 'req.headers.cookie', 'res.headers']
        : ['req', 'res', 'responseTime']
    }
  },
  mongoUri: {
    doc: 'URI for mongodb',
    format: String,
    default: 'mongodb://127.0.0.1:27017/',
    env: 'MONGO_URI'
  },
  mongoDatabase: {
    doc: 'database for mongodb',
    format: String,
    default: 'land-grants-api',
    env: 'MONGO_DATABASE'
  },
  seedDb: {
    doc: 'Seed the database',
    format: Boolean,
    default: false,
    env: 'SEED_DB'
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
  tracing: {
    header: {
      doc: 'Which header to track',
      format: String,
      default: 'x-cdp-request-id',
      env: 'TRACING_HEADER'
    }
  }
})

config.validate({ allowed: 'strict' })

export { config }
