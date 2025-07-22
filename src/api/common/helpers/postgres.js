import { fromNodeProviderChain } from '@aws-sdk/credential-providers'
import { Signer } from '@aws-sdk/rds-signer'
import { Pool } from 'pg'
import { config } from '../../../config/index.js'
import { loadPostgresData } from './load-land-data.js'

const DEFAULT_PORT = 5432

/**
 * Gets a database token for authentication
 * @param {object} options Connection options
 * @param {string} [user] Optional user override
 * @returns {Promise<string>} Authentication token or local password
 */
async function getToken(options, user) {
  const username = user ?? options.user

  if (options.isLocal) {
    return options.passwordForLocalDev
  } else {
    const signer = new Signer({
      hostname: options.host,
      port: DEFAULT_PORT,
      username,
      credentials: fromNodeProviderChain(),
      region: options.region
    })
    return await signer.getAuthToken()
  }
}

/**
 * Creates a pool for a given user
 * @param {object} options Connection options
 * @param {object} server Hapi server instance
 * @param {string} [user] Optional user override
 * @returns {Pool} Database pool
 */
function createPool(options, server, user) {
  const username = user ?? options.user

  return new Pool({
    port: DEFAULT_PORT,
    user: username,
    password: async () => {
      server.logger.info(
        `Getting Postgres authentication token for user: ${username}`
      )
      return await getToken(options, username)
    },
    host: options.host,
    database: options.database,
    ...(!options.isLocal &&
      server.secureContext && {
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
     * @param {{user: string, ddlUser: string, host: string, database: string, isLocal: boolean, region: string, passwordForLocalDev?: string}} options
     * @returns {void}
     */
    register: async function (server, options) {
      server.logger.info('Setting up postgres')
      const pool = createPool(options, server)

      try {
        const client = await pool.connect()
        server.logger.info('Postgres connection successful')
        client.release()

        if (options.loadPostgresData) {
          const ddlUser = options.ddlUser
          server.logger.info(
            `Creating DDL pool for data seeding with user: ${ddlUser}`
          )
          const ddlPool = createPool(options, server, ddlUser)

          try {
            const ddlClient = await ddlPool.connect()
            server.logger.info('Postgres DDL connection successful')
            ddlClient.release()

            await loadPostgresData(
              'agreements-data.sql.gz',
              ddlPool,
              server.logger
            )
            await loadPostgresData(
              'land-parcels-data.sql.gz',
              ddlPool,
              server.logger
            )
            await loadPostgresData(
              'land-covers-data.sql.gz',
              ddlPool,
              server.logger
            )
            await loadPostgresData(
              'moorland-designations-data.sql.gz',
              ddlPool,
              server.logger
            )
            await loadPostgresData(
              'land-cover-codes-data.sql.gz',
              ddlPool,
              server.logger
            )
            await loadPostgresData(
              'land-cover-codes-actions-data.sql.gz',
              ddlPool,
              server.logger
            )
            await loadPostgresData(
              'compatibility-matrix.sql.gz',
              ddlPool,
              server.logger
            )
            await loadPostgresData(
              'actions-data.sql.gz',
              ddlPool,
              server.logger
            )

            server.logger.info('Data seeding completed')
          } catch (ddlErr) {
            server.logger.error(
              { err: ddlErr },
              'Failed to seed database with DDL user'
            )
            throw ddlErr
          } finally {
            await ddlPool.end()
            server.logger.info('DDL pool closed')
          }
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
    ddlUser: config.get('postgres.ddlUser'),
    database: config.get('postgres.database'),
    host: config.get('postgres.host'),
    passwordForLocalDev: config.get('postgres.passwordForLocalDev'),
    isLocal: config.get('isLocal'),
    region: config.get('postgres.region'),
    loadPostgresData: config.get('loadPostgresData')
  }
}
