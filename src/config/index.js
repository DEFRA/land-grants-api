import convict from 'convict'
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

const isProduction = process.env.NODE_ENV === 'production'
const isDev = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'
const isLocal = process.env.NODE_ENV === 'local'

let defaultServiceVersion = '0.0.0'

if (isTest) {
  const file = readFileSync(path.resolve(dirname, '../../package.json'), 'utf8')
  const json = JSON.parse(file)
  defaultServiceVersion = json.version
}

const config = convict({
  serviceVersion: {
    doc: 'The service version, this variable is injected into your docker container in CDP environments',
    format: String,
    nullable: true,
    default: defaultServiceVersion,
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
  postgres: {
    host: {
      doc: 'Postgres Land Data DB host',
      format: String,
      default: 'localhost',
      env: 'POSTGRES_HOST'
    },
    hostRead: {
      doc: 'Postgres Land Data DB host',
      format: String,
      default: 'localhost',
      env: 'POSTGRES_HOST_READ'
    },
    region: {
      doc: 'Postgres Land Data DB region',
      format: String,
      default: 'eu-west-2',
      env: 'POSTGRES_REGION'
    },
    database: {
      doc: 'Postgres Land Data DB name',
      format: String,
      default: 'land_grants_api',
      env: 'POSTGRES_DATABASE'
    },
    user: {
      doc: 'Postgres Land Data DB username',
      format: String,
      default: 'land_grants_api',
      env: 'POSTGRES_USERNAME'
    },
    passwordForLocalDev: {
      doc: 'Postgres Land Data DB password',
      format: String,
      default: 'land_grants_api',
      env: 'POSTGRES_PASSWORD'
    }
  },
  s3: {
    region: {
      doc: 'S3 Land Data DB region',
      format: String,
      default: 'eu-west-2',
      env: 'AWS_REGION'
    },
    endpoint: {
      doc: 'S3 Land Data DB endpoint',
      format: String,
      default: 'http://localhost:4566',
      env: 'S3_ENDPOINT'
    },
    bucket: {
      doc: 'S3 Land Data DB bucket',
      format: String,
      default: 'land-data',
      env: 'S3_BUCKET'
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
    default: isLocal
  },
  loadPostgresData: {
    doc: 'If we need to load the postgres data',
    format: Boolean,
    default: false,
    env: 'LOAD_POSTGRES_DATA'
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
