import mongoose from 'mongoose'
import { getLandCoversForAction } from '../api/land-cover-codes/queries/getLandCovers.query.js'
import landCoverCodesModel from '../api/land-cover-codes/models/action-land-covers.model.js'
import landCoverCodes from '../api/common/helpers/seed-data/action-land-covers.js'

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
      await landCoverCodesModel.db.dropCollection('land-cover-codes')
    } catch (error) {
      // Ignore error if collection doesn't exist
      if (error.codeName !== 'NamespaceNotFound') {
        throw error
      }
    }
    await landCoverCodesModel.insertMany(landCoverCodes)
  })

  afterAll(async () => {
    await mongoose.disconnect()
  })

  test('should return all land cover codes for GRH8', async () => {
    const landCovers = await getLandCoversForAction('GRH8', logger)
    expect(landCovers).toEqual([
      { landCoverCode: '111', landCoverClassCode: '110' },
      { landCoverCode: '131', landCoverClassCode: '130' },
      { landCoverCode: '118', landCoverClassCode: '110' },
      { landCoverCode: '112', landCoverClassCode: '110' },
      { landCoverCode: '117', landCoverClassCode: '110' }
    ])
    expect(true).toBe(true)
  })
})
