import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { Signer } from '@aws-sdk/rds-signer'
import { Pool } from 'pg'
import { config } from '../../../config/index.js'
import { getStats } from '../../statistics/queries/stats.query.js'

const DEFAULT_PORT = 5432

/**
 * Gets a database token for authentication
 * @param {object} options Connection options
 * @returns {Promise<string>} Authentication token or local password
 */
async function getToken(options) {
  if (options.isLocal) {
    return options.passwordForLocalDev
  } else {
    const signer = new Signer({
      hostname: options.host,
      port: DEFAULT_PORT,
      username: options.user,
      credentials: fromNodeProviderChain(),
      region: options.region
    })
    return signer.getAuthToken()
  }
}

/**
 * @returns {object} Database options
 * @property {string} user - Database username
 * @property {string} database - Database name
 * @property {string} host - Database host
 * @property {string} passwordForLocalDev - Database password for local development
 * @property {boolean} isLocal - Whether the database is local
 * @property {string} region - Database region
 * @property {boolean} loadPostgresData - Whether to load Postgres data
 */
export function getDBOptions() {
  if (config.get('isTest')) {
    return {
      host: config.get('postgres.host'),
      user: config.get('postgres.user'),
      database: config.get('postgres.database'),
      password: config.get('postgres.passwordForLocalDev'),
      port: Number(process.env.POSTGRES_PORT ?? DEFAULT_PORT)
    }
  }
  return {
    user: config.get('postgres.user'),
    database: config.get('postgres.database'),
    host: config.get('postgres.host'),
    passwordForLocalDev: config.get('postgres.passwordForLocalDev'),
    isLocal: config.get('isLocal'),
    region: config.get('postgres.region'),
    loadPostgresData: config.get('loadPostgresData')
  }
}

const initializePool = async (logger, pool) => {
  await pool.query('SELECT 1')
  logger.info('Connection pool initialized')
}

/**
 *
 * @param {*} options - database configuration options
 * @param {*} server - server instance
 * @returns {Pool} Database pool
 */
export function createDBPool(options, server = {}) {
  if (config.get('isTest')) {
    return new Pool({
      port: options.port || DEFAULT_PORT,
      user: options.user,
      password: options.password,
      host: options.host,
      database: options.database
    })
  }
  return new Pool({
    port: options.port || DEFAULT_PORT,
    user: options.user,
    password: async () => {
      server?.logger?.info('Getting Postgres authentication token')
      try {
        const token = await getToken(options)
        return token
      } catch (error) {
        server?.logger?.error('Failed to get Postgres authentication token', {
          error: error.message,
          user: options.user,
          host: options.host
        })
        throw error
      }
    },
    host: options.host,
    database: options.database,
    // Start New Pool configuration
    max: 10, // Maximum number of connections the pool can create, we keep this at 10, as we use aurora, which scales number of connections automatically
    min: 2, // Minimum number of connections kept warm and ready, when we start the server, we keep 2 connections warm and ready (requires us to connect twice to the database)
    idleTimeoutMillis: 60000, // Close idle connections after 60 seconds (except min connections), connection timeout for connections greater than the 2 warm and ready connections
    connectionTimeoutMillis: 3000, // Fail requests after 3 seconds if no connection available, if the connection is not available, we fail the request
    // End New Pool configuration
    maxLifetimeSeconds: 60 * 10, // This should be set to less than the RDS Token lifespan (15 minutes)
    ...(!options.isLocal &&
      server?.secureContext && {
        ssl: {
          secureContext: server.secureContext
        }
      })
  })
}

/**
 * @satisfies { import('@hapi/hapi').ServerRegisterPluginObject<*> }
 */
export const postgresDb = {
  plugin: {
    name: 'postgres',
    version: '1.0.0',
    /**
     *
     * @param { import('@hapi/hapi').Server } server
     * @param {{user: string, host: string, database: string, isLocal: boolean, region: string, passwordForLocalDev?: string}} options
     * @returns {Promise<void>}
     */
    register: async function (server, options) {
      server.logger.info('Setting up postgres')

      const pool = createDBPool(options, server)

      try {
        server.logger.info(`Before init, pool connections: ${pool.totalCount}`)
        await Promise.all([
          initializePool(server.logger, pool),
          initializePool(server.logger, pool)
        ])
        await getStats(server.logger, pool)
        server.logger.info(`After init, pool connections: ${pool.totalCount}`)
        server.decorate('server', 'postgresDb', pool)
      } catch (err) {
        server.logger.error({ err }, 'Failed to connect to Postgres')
        throw err
      }

      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      server.events.on('stop', async () => {
        server.logger.info('Closing Postgres pool')
        await pool.end()
      })
    }
  },
  options: getDBOptions()
}
