import { type } from 'os'
import { GenericContainer } from 'testcontainers'
import timeSpan from 'time-span'

/**
 * DB setup file. Idea stolen from:
 * https://github.com/ivandotv/jest-database-containers
 */

global.containers = []

let firstRun = true

export default async () => {
  process.env.JEST_FIRST_RUN = firstRun ? 'yes' : 'no'

  if (firstRun) {
    console.log('\nsetup started')
    const end = timeSpan()

    const postgresContainer = initializePostgres()

    const startedContainers = await Promise.all([postgresContainer])

    global.containers.push(...startedContainers)

    console.log(`setup done in: ${end.seconds()} seconds`)
  }

  firstRun = false
}

async function initializePostgres() {
  const postgresContainer = new GenericContainer('postgis/postgis:16-3.4')
    .withExposedPorts(5432)
    .withEnvironment({
      POSTGRES_USER: process.env.POSTGRES_USER,
      POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
      POSTGRES_DB: process.env.POSTGRES_DB
    })

  if (type() === 'Linux') {
    console.log('postgres: using tmpfs mount')
    postgresContainer.withTmpFs({ '/var/lib/postgresql/data': '' })
  }

  const postgresStarted = await startContainer(postgresContainer, 'postgress')

  process.env.POSTGRES_PORT = postgresStarted.getMappedPort(5432)
  process.env.POSTGRES_USER = POSTGRES_USER
  process.env.POSTGRES_PASSWORD = POSTGRES_PASSWORD
  process.env.POSTGRES_DB = POSTGRES_DB

  return postgresStarted
}

async function startContainer(containerBuilder, name) {
  const end = timeSpan()
  const startedContainer = await containerBuilder.start()

  console.log(`${name} started in: ${end.seconds()} seconds`)

  return startedContainer
}
