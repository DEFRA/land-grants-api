import mongoose from 'mongoose'
import data from '~/src/api/common/helpers/seed-data/index.js'
import models from '~/src/api/common/models/index.js'

export async function seedDatabase(logger) {
  while (mongoose.connection.readyState !== mongoose.STATES.connected) {
    logger.info('Waiting for mongoose to connect...')
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  for (const [name, model] of Object.entries(models)) {
    try {
      await model.db
        .dropCollection(name)
        .catch(() => logger.warn(`Collection '${name}' does not exist`))

      logger.info(`Dropped collection '${name}'`)

      await model.insertMany(data[name]).catch((e) => {
        logger.error(e)
      })

      logger.info(
        `Successfully inserted ${data[name].length} land actions into the '${name}' collection`
      )
    } catch (e) {
      logger.error(e)
    }
  }
}
