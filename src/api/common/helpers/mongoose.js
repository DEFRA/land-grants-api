import mongoose from 'mongoose'

import { config } from '../../../config/index.js'
import { seedDatabase } from './seed-database.js'

/**
 * @satisfies { import('@hapi/hapi').ServerRegisterPluginObject<*> }
 */
export const mongooseDb = {
  plugin: {
    name: 'mongoose',
    version: '1.0.0',
    /**
     *
     * @param { import('@hapi/hapi').Server } server
     * @param {{mongoUrl: string, databaseName: string}} options
     * @returns {void}
     */
    register: async function (server, options) {
      server.logger.info('Setting up mongoose')

      await mongoose.connect(options.mongoUrl, {
        dbName: options.databaseName
      })

      server.decorate('server', 'mongooseDb', mongoose.connection)

      // Seed the database if required
      if (config.get('seedMongoDb') === true) {
        server.logger.info('Seeding database')
        await seedDatabase(server.logger)
      }

      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      server.events.on('stop', async () => {
        server.logger.info('Closing Mongoose client')
        await mongoose.disconnect()
      })
    }
  },
  options: {
    mongoUrl: config.get('mongoUri'),
    databaseName: config.get('mongoDatabase')
  }
}

/**
 * To be mixed in with Request|Server to provide the db decorator
 * @typedef {{connection: import('mongoose').connection }} MongoosePlugin
 */
