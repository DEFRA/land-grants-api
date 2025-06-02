import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { Signer } from '@aws-sdk/rds-signer'
import { Client, Pool } from 'pg'
import { config } from '~/src/config/index.js'
import { loadPostgresData } from './load-land-data.js'

const DEFAULT_PORT = 5432

/**
 * Get RDS auth token (no caching for now)
 * @param {object} options
 * @returns {Promise<string>}
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
 * Custom Client class that fetches fresh IAM tokens on connect
 */
class IAMClient extends Client {
  constructor(config, server, options) {
    super(config)
    this.server = server
    this.options = options
  }

  async connect() {
    try {
      this.server.logger.info('IAMClient connecting with fresh token')
      const password = await getToken(this.options)

      // Update the connectionParameters.password which is what pg uses
      this.connectionParameters.password = password
      this.password = password

      this.server.logger.info('Password set for connection')
      return super.connect()
    } catch (err) {
      this.server.logger.error({ err }, 'Failed to connect with IAM token')
      throw err
    }
  }
}

/**
 * Custom Pool class using IAMClient
 */
class SecurePool extends Pool {
  constructor(options, server) {
    server.logger.info(
      `Creating SecurePool with options: ${JSON.stringify({
        ...options,
        passwordForLocalDev: options.passwordForLocalDev
          ? '[REDACTED]'
          : undefined
      })}`
    )

    super({
      host: options.host,
      port: options.port,
      database: options.database,
      user: options.user,
      region: options.region,
      Client: class extends IAMClient {
        constructor(config) {
          super(config, server, options)
        }
      },
      ssl: !options.isLocal
        ? {
            rejectUnauthorized: false,
            secureContext: server.secureContext
          }
        : undefined
    })

    this.options = options
    this.server = server
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
     * @param {{user: string, host: string, database: string, isLocal: boolean, disablePostgres: boolean, region: string, passwordForLocalDev?: string}} options
     * @returns {void}
     */
    register: async function (server, options) {
      server.logger.info('Setting up postgres')

      if (options.disablePostgres) {
        server.logger.info('Skipping Postgres connection in test mode')
        return
      }

      const pool = new SecurePool(
        {
          port: DEFAULT_PORT,
          user: options.user,
          host: options.host,
          database: options.database,
          region: options.region,
          passwordForLocalDev: options.passwordForLocalDev,
          isLocal: options.isLocal
        },
        server
      )

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
