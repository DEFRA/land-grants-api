import * as mongoose from 'mongoose'
import { config } from '~/src/config/index.js'
import { pino } from 'pino'
import { loggerOptions } from '../logging/logger-options.js'
import data from './data/index.js'

import models from '~/src/models/index.js'

const logger = pino(loggerOptions, pino.destination())

await mongoose.connect(
  `${config.get('mongoUri')}${config.get('mongoDatabase')}`
)
logger.info(`Mongoose connected`)

// eslint-disable-next-line @typescript-eslint/no-unused-vars
for (const [name, model] of Object.entries(models)) {
  try {
    await model.db.dropCollection(model.collection.name)
    logger.info(`Dropped collection '${model.collection.name}'`)

    await model.insertMany(data[model.collection.name])
    logger.info(
      `Successfully inserted ${data[model.collection.name].length} documents into the '${model.collection.name}' collection`
    )
  } catch (e) {
    logger.error(e)
  }
}

await mongoose.disconnect()
logger.info(`Mongoose disconnected`)
