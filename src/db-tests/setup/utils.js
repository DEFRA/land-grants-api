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

export const createResponseCapture = () => {
  let responseData = null
  let statusCode = null

  const h = {
    response: (data) => {
      responseData = data
      return {
        code: (code) => {
          statusCode = code
          return { data: responseData, statusCode }
        }
      }
    }
  }

  return {
    h,
    getResponse: () => ({ data: responseData, statusCode })
  }
}

export const createHandler = (
  parcelIds,
  fields,
  currentActions,
  logger,
  connection
) => {
  return {
    payload: {
      parcelIds,
      fields,
      currentActions
    },
    logger,
    server: {
      postgresDb: connection
    }
  }
}
