import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { Signer } from '@aws-sdk/rds-signer'
import pg, { Client } from 'pg'
import { config } from '~/src/config/index.js'
import { loadPostgresData } from './load-land-data.js'

const { Pool } = pg

const DEFAULT_PORT = 5432

/**
 * Gets a database token for authentication
 * @param {object} server
 * @param {object} options Connection options
 * @returns {Promise<string>} Authentication token or local password
 */
async function getToken(server, options) {
  let token = await server.app.tokenCache.get('rds-token') // use the cached token
  if (!token) {
    if (options.postgres.iamAuthentication) {
      const signer = new Signer({
        hostname: options.postgres.host,
        port: options.postgres.port,
        username: options.postgres.user,
        credentials: fromNodeProviderChain(),
        region: options.region
      })
      token = await signer.getAuthToken()
    } else {
      token = 'admin'
    }
  }
  return token
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
     * @param {{user: string, host: string, database: string, isLocal: boolean, disablePostgres: boolean}} options
     * @returns {void}
     */
    register: async function (server, options) {
      server.logger.info('Setting up postgres')
      if (options.disablePostgres) {
        server.logger.info('Skipping Postgres connection in test mode')
        return
      }

      const tokenCache = server.cache({
        segment: 'rdsToken',
        expiresIn: 15 * 60 * 1000, // 15 minutes
        generateTimeout: 2000 // timeout for token generation
      })

      server.app.tokenCache = tokenCache

      const pool = new Pool({
        user: options.postgres.user,
        host: options.postgres.host,
        port: DEFAULT_PORT, // options.postgres.port,
        database: options.postgres.database,
        region: options.region,
        Client: IAMClient,
        ...(server.secureContext && {
          ssl: {
            rejectUnauthorized: false,
            secureContext: server.secureContext
          }
        })
      })

      try {
        const client = await pool.connect()
        server.logger.info('Postgres connection successful')
        client.release()

        if (options.isLocal) {
          await loadPostgresData('land-parcels-data.sql', pool, server.logger)
          await loadPostgresData('land-covers-data.sql', pool, server.logger)
          await loadPostgresData(
            'moorland-designations-data.sql',
            pool,
            server.logger
          )
        }

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
    disablePostgres: config.get('disablePostgres')
  }
}

class IAMClient extends Client {
  async connect(server, host, port, user, region) {
    this.connectionParameters.password = await getToken(server, {
      host,
      port,
      user,
      region
    })
    return super.connect()
  }
}
