import { Server } from '@hapi/hapi'
import pino from 'pino'
import { mongooseDb } from './api/common/helpers/mongoose.js'
import mongoose from 'mongoose'

const logger = pino({ level: 'info' })
const server = new Server({ port: 1 })
server.logger = logger

server.secureContext = null

async function run() {
  try {
    logger.info('Initializing MongooseDb plugin to load data...')

    await Promise.resolve(
      mongooseDb.plugin.register(server, {
        ...mongooseDb.options,
        seedMongoDb: true
      })
    )

    logger.info('MongooseDb data load complete.')
    await mongoose.disconnect()
  } catch (err) {
    logger.error({ err }, 'MongooseDb data loading failed')
    throw err
  }
}

run().catch((err) => {
  logger.error({ err }, 'Uncaught error during data load')
})
