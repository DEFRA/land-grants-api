import { postgresDb } from './api/common/helpers/postgres.js'
import { Server } from '@hapi/hapi'
import pino from 'pino'

const logger = pino({ level: 'info' })
const server = new Server({ port: 0 })
server.logger = logger

server.secureContext = null

export function seedPostgresData() {
  try {
    logger.info('Initializing Postgres plugin to load data...')
    postgresDb.plugin.register(server, {
      ...postgresDb.options,
      loadPostgresData: true
    })

    logger.info('Data load complete.')
  } catch (err) {
    logger.error({ err }, 'Postgres data loading failed')
    throw err
  }
}

seedPostgresData()
