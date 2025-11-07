import { type } from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { GenericContainer, Network, Wait } from 'testcontainers'
import { config } from '../../config/index.js'

export const containers = []

export const DB_CONFIG = {
  host: config.get('postgres.host'),
  user: config.get('postgres.user'),
  database: config.get('postgres.database'),
  password: config.get('postgres.passwordForLocalDev')
}

export const S3_CONFIG = {
  region: 'eu-west-2',
  credentials: {
    accessKeyId: 'test',
    secretAccessKey: 'test'
  },
  bucket: config.get('s3.bucket')
}

const log = (stream, name) => {
  /* eslint-disable no-console */
  stream.on('data', console.log)
  stream.on('err', console.error)
  stream.on('end', () => console.log(`${name} Stream closed`))
}

export default async () => {
  const network = await new Network().start()

  // Start Postgres
  const postgresContainer = initializePostgres(network)
  const postgresStarted = await postgresContainer.start()
  const liquibaseContainer = initializeLiquibase(network)
  await liquibaseContainer.start()

  // Start LocalStack for S3
  const localStackContainer = initializeLocalStack(network)
  const localStackStarted = await localStackContainer.start()

  // Set environment variables
  process.env.POSTGRES_PORT = postgresStarted.getMappedPort(5432).toString()
  process.env.S3_ENDPOINT = `http://${localStackStarted.getHost()}:${localStackStarted.getMappedPort(4566)}`
  process.env.INGEST_BUCKET = S3_CONFIG.bucket
  process.env.AWS_REGION = S3_CONFIG.region
  process.env.AWS_ACCESS_KEY_ID = S3_CONFIG.credentials.accessKeyId
  process.env.AWS_SECRET_ACCESS_KEY = S3_CONFIG.credentials.secretAccessKey

  containers.push(postgresStarted, localStackStarted)
}

function initializeLiquibase(network) {
  // Pinning Liquibase version for now, we were getting an error with 5.0.0. This should removed later
  return new GenericContainer('liquibase/liquibase:4.32.0')
    .withName('liquibase')
    .withNetwork(network)
    .withLogConsumer((stream) => log(stream, 'Liquibase'))
    .withWaitStrategy(
      Wait.forLogMessage("Liquibase command 'update' was executed successfully")
    )
    .withStartupTimeout(120_000)
    .withCopyDirectoriesToContainer([
      {
        source: path.resolve(
          path.dirname(fileURLToPath(import.meta.url)),
          '../../../changelog'
        ),
        target: '/liquibase/changelog'
      }
    ])
    .withCommand([
      'update',
      '--url=jdbc:postgresql://postgis:5432/' + DB_CONFIG.database,
      '--username=' + DB_CONFIG.user,
      '--password=' + DB_CONFIG.password,
      '--changeLogFile=/changelog/db.changelog.xml'
    ])
}

function initializePostgres(network) {
  return new GenericContainer('postgis/postgis:16-3.4')
    .withName('postgis')
    .withNetwork(network)
    .withExposedPorts(5432)
    .withLogConsumer((stream) => log(stream, 'Postgres'))
    .withTmpFs(type() === 'Linux' ? { '/var/lib/postgresql/data': '' } : {})
    .withEnvironment({
      POSTGRES_USER: DB_CONFIG.user,
      POSTGRES_PASSWORD: DB_CONFIG.password,
      POSTGRES_DB: DB_CONFIG.database,
      POSTGRES_PORT: '5432'
    })
}

function initializeLocalStack(network) {
  return new GenericContainer('localstack/localstack:3.0.2')
    .withName('localstack-test')
    .withNetwork(network)
    .withExposedPorts(4566)
    .withLogConsumer((stream) => log(stream, 'LocalStack'))
    .withEnvironment({
      SERVICES: 's3',
      DEBUG: '0',
      LS_LOG: 'WARN',
      AWS_ACCESS_KEY_ID: S3_CONFIG.credentials.accessKeyId,
      AWS_SECRET_ACCESS_KEY: S3_CONFIG.credentials.secretAccessKey,
      AWS_DEFAULT_REGION: S3_CONFIG.region
    })
    .withWaitStrategy(Wait.forLogMessage(/Ready\./))
    .withStartupTimeout(60_000)
}
