import pg from 'pg'
import { config } from '~/src/config/index.js'
import { getValidToken } from './entra/token-manager.js'
const { Pool } = pg

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
     * @param {{user: string, host: string, database: string}} options
     * @returns {void}
     */
    register: async function (server, options) {
      server.logger.info('Setting up postgres')

      const pool = new Pool({
        user: options.user,
        ssl: true,
        password: await getValidToken(),
        host: options.host,
        database: options.database
      })

      try {
        const client = await pool.connect()
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
    user: config.get('landData.dbUser'),
    database: config.get('landData.dbName'),
    host: config.get('landData.dbHost')
  }
}
