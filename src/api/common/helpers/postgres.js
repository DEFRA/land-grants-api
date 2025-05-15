import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { Signer } from '@aws-sdk/rds-signer'
import pg from 'pg'
import { config } from '~/src/config/index.js'
import { loadPostgresData } from './load-land-data.js'

const { Pool } = pg

const DEFAULT_PORT = 5432

/**
 * Gets a database token for authentication
 * @param {object} options Connection options
 * @returns {Promise<string>} Authentication token or local password
 */
async function getToken(options) {
  if (!options.isLocal) {
    const signer = new Signer({
      hostname: options.host,
      port: DEFAULT_PORT,
      username: options.user,
      credentials: fromNodeProviderChain(),
      region: options.region
    })
    return await signer.getAuthToken()
  } else {
    return options.passwordForLocalDev
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

      if (!options.isLocal && server.secureContext) {
        server.logger.info(
          'Secure context is available for Postgres SSL connection'
        )

        server.logger.info(
          'SecureContext properties:',
          Object.keys(server.secureContext)
        )

        if (server.secureContext.context) {
          server.logger.info('SecureContext has internal context object')

          try {
            const contextMethods = Object.getOwnPropertyNames(
              Object.getPrototypeOf(server.secureContext.context)
            )
            server.logger.info('Context methods available:', contextMethods)
          } catch (err) {
            server.logger.warn(
              'Could not inspect context methods:',
              err.message
            )
          }

          try {
            if (
              typeof server.secureContext.context.getCertificate === 'function'
            ) {
              const certInfo = server.secureContext.context.getCertificate()
              server.logger.info('Certificate info available:', !!certInfo)
            }
          } catch (err) {
            server.logger.warn('Could not get certificate info:', err.message)
          }
        } else {
          server.logger.warn(
            'SecureContext does not have context property - may not be properly initialized'
          )
        }
      } else if (!options.isLocal) {
        server.logger.warn(
          'Secure context is not available for Postgres SSL connection'
        )
      }

      const sslConfig =
        !options.isLocal && server.secureContext
          ? { ssl: { secureContext: server.secureContext } }
          : {}

      server.logger.info('PostgreSQL connection config:', {
        user: options.user,
        host: options.host,
        port: DEFAULT_PORT,
        database: options.database,
        usingSsl: !!sslConfig.ssl
      })

      const pool = new Pool({
        user: options.user,
        password: await getToken(options),
        host: options.host,
        port: DEFAULT_PORT,
        database: options.database,
        ...sslConfig
      })

      try {
        const client = await pool.connect()
        server.logger.info('Postgres connection successful')
        client.release()

        if (options.isLocal) {
          await loadPostgresData('001-create-schema.sql', pool, server.logger)
          await loadPostgresData(
            '002-create-land-table.sql',
            pool,
            server.logger
          )
          await loadPostgresData(
            '003-create-land-covers-table.sql',
            pool,
            server.logger
          )
          await loadPostgresData(
            '004-create-moorland-designations-table.sql',
            pool,
            server.logger
          )
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
    disablePostgres: config.get('disablePostgres'),
    seed: config.get('seedDb')
  }
}
