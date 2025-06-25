import mongoose from 'mongoose'
import compatibilityMatrixModel from '~/src/api/actions/models/compatibilityMatrix.model.js'
import { calculateAvailableArea } from '~/src/available-area/index.js'
import compatibilityMatrix from '~/src/db-tests/fixtures/compatibility-matrix.json'
import { compatibilitycodes } from '~/src/db-tests/fixtures/compatibilityCodes.js'

const logger = {
  info: jest.fn(),
  error: jest.fn()
}

describe('Get land cover codes', () => {
  beforeAll(async () => {
    await mongoose.connect(
      `mongodb://${process.env.MONGO_HOST}:${process.env.MONGO_PORT}`,
      {
        dbName: 'land-grants-api'
      }
    )

    try {
      await compatibilityMatrixModel.db.dropCollection('compatibility-matrix')
    } catch (error) {
      // Ignore error if collection doesn't exist
      if (error.codeName !== 'NamespaceNotFound') {
        throw error
      }
    }
    await compatibilityMatrixModel.insertMany(compatibilityMatrix)
  })

  afterAll(async () => {
    await mongoose.disconnect()
  })

  test('should return availableArea', async () => {
    const landCovers = await calculateAvailableArea(logger)
    expect(landCovers).toEqual(compatibilitycodes)
    expect(true).toBe(true)
  })
})
