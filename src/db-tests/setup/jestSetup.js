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

const log = (stream, name) => {
  /* eslint-disable no-console */
  stream.on('data', console.log)
  stream.on('err', console.error)
  stream.on('end', () => console.log(`${name} Stream closed`))
}

export default async () => {
  const network = await new Network().start()
  const postgresContainer = initializePostgres(network)
  const postgresStarted = await postgresContainer.start()

  const liquibaseContainer = initializeLiquibase(network)
  await liquibaseContainer.start()

  process.env.POSTGRES_PORT = postgresStarted.getMappedPort(5432)
  containers.push(postgresStarted)

  const mongoContainer = initializeMongo(network)
  const mongoStarted = await mongoContainer.start()

  const host = mongoStarted.getHost()
  const port = mongoStarted.getMappedPort(27017)
  process.env.MONGO_PORT = port
  process.env.MONGO_HOST = host
  containers.push(mongoStarted)
}

function initializeMongo(network) {
  return new GenericContainer('mongo:6.0.13')
    .withName('mongo')
    .withNetwork(network)
    .withExposedPorts(27017)
}

function initializeLiquibase(network) {
  return new GenericContainer('liquibase/liquibase')
    .withName('liquibase')
    .withNetwork(network)
    .withLogConsumer((stream) => log(stream, 'Liquibase'))
    .withWaitStrategy(
      Wait.forLogMessage("Liquibase command 'update' was executed successfully")
    )
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
      POSTGRES_PORT: 5432
    })
}
