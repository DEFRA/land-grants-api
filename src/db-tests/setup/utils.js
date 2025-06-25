import mongoose from 'mongoose'

export const connectMongo = async () => {
  await mongoose.connect(
    `mongodb://${process.env.MONGO_HOST}:${process.env.MONGO_PORT}`,
    {
      dbName: 'land-grants-api'
    }
  )
}

export const seedMongo = async (model, collection, data) => {
  try {
    await model.db.dropCollection(collection)
  } catch (error) {
    if (error.codeName !== 'NamespaceNotFound') {
      throw error
    }
  }
  await model.insertMany(data)
}

export const closeMongo = async () => {
  await mongoose.disconnect()
}
