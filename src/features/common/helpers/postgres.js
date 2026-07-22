import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { Signer } from '@aws-sdk/rds-signer'
import { Client, Pool } from 'pg'
import { config } from '../../../config/index.js'

const DEFAULT_PORT = 5432
const keepAliveInterval = 60000

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

/**
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
    maxLifetimeSeconds: 60 * 10, // This should be set to less than the RDS Token lifespan (15 minutes)
    min: 2, // Minimum number of connections to keep warm, Reduces cold-start latency and connection churn
    max: 10, // Maximum number of connections the pool can create, we keep this at 10, as we use aurora, which scales number of connections automatically
    keepAlive: true, // Enable OS-level TCP keepalive probes, detects dead connections early (no SELECT 1 needed)
    keepAliveInitialDelayMillis: 10000, // Wait 10s after a connection becomes idle before sending first probe, balances early detection vs unnecessary network traffic
    idleTimeoutMillis: 30000, // Release idle connections after 30s so a previous version hands back connections during a rolling deploy
    connectionTimeoutMillis: 10000, // How long to wait for a free connection before failing, prevents requests from hanging under load
    allowExitOnIdle: false, // Keep Node.js process alive even when pool is idle, required for servers / APIs
    ...(!options.isLocal &&
      server?.secureContext && {
        ssl: {
          secureContext: server.secureContext
        }
      })
  })
}

/**
 * Creates a single database client (not a pool). Use this in worker threads
 * where each worker only needs one connection, to avoid each worker creating
 * its own pool and multiplying total connection count.
 * @param {*} options - database configuration options
 * @param {*} server - server instance
 * @returns {Client} Database client
 */
export function createDBClient(options, server = {}) {
  if (config.get('isTest')) {
    return new Client({
      port: options.port || DEFAULT_PORT,
      user: options.user,
      password: options.password,
      host: options.host,
      database: options.database
    })
  }
  return new Client({
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
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
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
     */
    register: function (server, options) {
      server.logger.info('Setting up postgres')

      const pool = createDBPool(options, server)

      server.decorate('server', 'postgresDb', pool)

      pool.on('error', (err) => {
        server.logger.error({ err }, 'Unexpected idle Postgres client error')
      })

      const keepAlive = setInterval(() => {
        pool.query('SELECT 1').catch((err) => {
          server.logger.debug({ err }, 'Postgres keep-alive query failed')
        })
      }, keepAliveInterval)
      keepAlive.unref()

      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      server.events.on('stop', async () => {
        server.logger.info('Closing Postgres pool')
        clearInterval(keepAlive)
        try {
          await pool.end()
        } catch (err) {
          server.logger.error({ err }, 'Error closing Postgres pool')
        }
      })

      pool.on('connect', () => {
        server.logger.debug('New client connected')
      })

      pool.on('acquire', () => {
        server.logger.debug('Client acquired from pool')
      })

      pool.on('remove', () => {
        server.logger.debug('Client removed from pool')
      })
    }
  },
  options: getDBOptions()
}
