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
  // unpack gz to sql
  // execSync('scripts/extrac', (err, stdout, stderr) => {

  const network = await new Network().start()
  const postgresContainer = initializePostgres(network)
  const postgresStarted = await postgresContainer.start()
  const liquibaseContainer = initializeLiquibase(network)
  await liquibaseContainer.start()

  process.env.POSTGRES_PORT = postgresStarted.getMappedPort(5432).toString()
  containers.push(postgresStarted)
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
