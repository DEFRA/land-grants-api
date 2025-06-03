/* eslint-disable no-console */

import { type } from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { GenericContainer, Network, Wait } from 'testcontainers'
import { config } from '../..//src/config/index.js'

export const containers = []

export const DB_CONFIG = {
  host: config.get('postgres.host'),
  user: config.get('postgres.user'),
  database: config.get('postgres.database'),
  password: config.get('postgres.passwordForLocalDev')
}

export default async () => {
  console.log('Running global setup for database tests')
  const postgresContainer = await initializePostgres()
  process.env.POSTGRES_PORT = postgresContainer.getMappedPort(5432)
  containers.push(postgresContainer)
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
      POSTGRES_DB: DB_CONFIG.database,
      POSTGRES_PORT: 5432
    })

  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  const dirname = path.resolve(currentDir, '../../changelog')

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
        source: dirname,
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
  return postgresStarted
}
