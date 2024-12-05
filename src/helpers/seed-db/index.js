import { MongoClient } from 'mongodb'
import { config } from '~/src/config/index.js'
import { pino } from 'pino'
import data from './data/index.js'

const logger = pino({}, pino.destination())

const client = await MongoClient.connect(config.get('mongoUri'))
const databaseName = config.get('mongoDatabase')
const db = client.db(databaseName)

logger.info(`mongodb connected to ${databaseName}`)

for (const [collection, documents] of Object.entries(data)) {
  await db.dropCollection(collection)
  logger.info(`Dropped collection '${collection}'`)

  await db.collection(collection).insertMany(documents)
  logger.info(
    `Successfully inserted ${documents.length} documents into the '${collection}' collection`
  )
}

await client.close()
