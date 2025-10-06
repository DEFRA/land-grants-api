import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { Signer } from '@aws-sdk/rds-signer'
import { Pool } from 'pg'
import { config } from '../../../config/index.js'

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
    return await signer.getAuthToken()
  }
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

      const pool = new Pool({
        port: DEFAULT_PORT,
        user: options.user,
        password: async () => {
          server.logger.info('Getting Postgres authentication token')
          return await getToken(options)
        },
        host: options.host,
        database: options.database,
        maxLifetimeSeconds: 60 * 10, // This should be set to less than the RDS Token lifespan (15 minutes)
        ...(!options.isLocal &&
          // @ts-expect-error - secureContext
          server.secureContext && {
            ssl: {
              // @ts-expect-error - secureContext
              secureContext: server.secureContext
            }
          })
      })

      try {
        const client = await pool.connect()
        if (options.isLocal) {
          await client.query('SET log_min_duration_statement = 0;')
        }
        server.logger.info('Postgres connection successful')
        client.release()
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
  options: {
    user: config.get('postgres.user'),
    database: config.get('postgres.database'),
    host: config.get('postgres.host'),
    passwordForLocalDev: config.get('postgres.passwordForLocalDev'),
    isLocal: config.get('isLocal'),
    region: config.get('postgres.region'),
    loadPostgresData: config.get('loadPostgresData')
  }
}
