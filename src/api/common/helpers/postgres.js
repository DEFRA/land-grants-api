import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { Signer } from '@aws-sdk/rds-signer'
import { Pool } from 'pg'
import { config } from '~/src/config/index.js'
import { loadPostgresData } from './load-land-data.js'

const DEFAULT_PORT = 5432

class SecurePool extends Pool {
  constructor(options) {
    super({
      max: 10,
      host: options.host,
      port: options.port,
      database: options.database,
      user: options.user,
      ssl: !options.isLocal
        ? {
            rejectUnauthorized: false,
            secureContext: options.secureContext
          }
        : undefined
    })

    this.options = options

    this.signer = new Signer({
      hostname: options.host,
      username: options.user,
      region: options.region,
      port: DEFAULT_PORT,
      credentials: fromNodeProviderChain()
    })

    this.originalConnect = super.connect.bind(this)
  }

  async connect() {
    this.options.password = this.options.isLocal
      ? this.options.passwordForLocalDev
      : await this.signer.getAuthToken()
    return this.originalConnect()
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

      const pool = new SecurePool({
        port: DEFAULT_PORT,
        user: options.user,
        host: options.host,
        database: options.database,
        region: options.region,
        secureContext: server.secureContext,
        passwordForLocalDev: options.passwordForLocalDev,
        isLocal: options.isLocal
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
