import { type } from 'os'
import { GenericContainer, Network, Wait } from 'testcontainers'
import path from 'path'
import { fileURLToPath } from 'url'

/**
 * DB setup file. Idea stolen from:
 * https://github.com/ivandotv/jest-database-containers
 */

global.containers = []

let firstRun = true

export const DB_CONFIG = {
  host: 'localhost',
  user: 'land_grants_api',
  database: 'land_grants_api',
  password: 'land_grants_api',
  port: 5432
}

export default async () => {
  console.log('Running global setup for database tests')
  process.env.JEST_FIRST_RUN = firstRun ? 'yes' : 'no'

  if (firstRun) {
    const postgresContainer = initializePostgres()

    const startedContainers = await Promise.all([postgresContainer])

    global.containers.push(...startedContainers)
  }

  firstRun = false
}

async function initializePostgres() {
  const network = await new Network().start()

  const postgresContainer = new GenericContainer('postgis/postgis:16-3.4')
    .withName('postgis')
    .withNetwork(network)
    .withExposedPorts(5432)
    .withLogConsumer((stream) => {
      stream.on('data', console.log)
      stream.on('err', console.error)
      stream.on('end', () => console.log('DB Stream closed'))
    })
    .withEnvironment({
      POSTGRES_USER: DB_CONFIG.user,
      POSTGRES_PASSWORD: DB_CONFIG.password,
      POSTGRES_DB: DB_CONFIG.database
    })

  const filename = fileURLToPath(import.meta.url)
  const dirname = path.dirname(filename)

  const liquibaseContainer = new GenericContainer('liquibase/liquibase')
    .withName('liquibase')
    .withNetwork(network)
    .withWaitStrategy(
      Wait.forLogMessage("Liquibase command 'update' was executed successfully")
    )
    .withLogConsumer((stream) => {
      stream.on('data', console.log)
      stream.on('err', console.error)
      stream.on('end', () => console.log('Liquibase Stream closed'))
    })
    .withCopyDirectoriesToContainer([
      {
        source: dirname + '/changelog',
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

  if (type() === 'Linux') {
    postgresContainer.withTmpFs({ '/var/lib/postgresql/data': '' })
  }

  const postgresStarted = await postgresContainer.start()
  await liquibaseContainer.start()

  process.env.POSTGRES_PORT = postgresStarted.getMappedPort(5432)
  process.env.POSTGRES_USER = DB_CONFIG.user
  process.env.POSTGRES_PASSWORD = DB_CONFIG.password
  process.env.POSTGRES_DB = DB_CONFIG.database

  return postgresStarted
}
