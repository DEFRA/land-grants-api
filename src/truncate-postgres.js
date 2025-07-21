import { Server } from '@hapi/hapi'
import pino from 'pino'
import { postgresDb } from './api/common/helpers/postgres.js'

const logger = pino({ level: 'info' })
const server = new Server({ port: 0 })
server.logger = logger

server.secureContext = null

export function truncatePostgresData() {
  try {
    logger.info('Initializing Postgres plugin to truncate data...')
    postgresDb.plugin.register(server, {
      ...postgresDb.options,
      truncatePostgresData: true
    })
    logger.info('Data truncate complete.')
  } catch (err) {
    logger.error({ err }, 'Postgres data truncate failed')
    throw err
  }
}

truncatePostgresData()
