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
async function getRemoteToken(server, options) {
  const signer = new Signer({
    hostname: options.host,
    port: DEFAULT_PORT,
    username: options.user,
    credentials: fromNodeProviderChain(),
    region: options.region
  })

  return await signer.getAuthToken()
}

/**
 * @param {import('@hapi/hapi').Server} server
 * @param {{passwordForLocalDev: string}} options
 * @returns {{password: string}}
 */
const getlocal = (server, options) => {
  return {
    password: options.passwordForLocalDev
  }
}

/**
 * @param {import('@hapi/hapi').Server} server
 * @returns {{Client: typeof IAMClient, ssl: {rejectUnauthorized: false, secureContext: import('tls').SecureContext}}}
 */
const getRemote = (server) => {
  return {
    Client: IAMClient,
    ...(server.secureContext && {
      ssl: {
        rejectUnauthorized: false,
        secureContext: server.secureContext
      }
    })
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
     * @param {{user: string, host: string, database: string, isLocal: boolean, disablePostgres: boolean}} options
     * @returns {void}
     */
    register: async function (server, options) {
      server.logger.info('Setting up postgres')
      if (options.disablePostgres) {
        server.logger.info('Skipping Postgres connection in test mode')
        return
      }

      const pool = new Pool({
        user: options.user,
        host: options.host,
        port: DEFAULT_PORT,
        database: options.database,
        region: options.region,
        ...(options.isLocal ? getlocal(server, options) : getRemote(server))
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
    this.connectionParameters.password = await getRemoteToken(server, {
      host,
      port,
      user,
      region
    })
    return super.connect()
  }
}
