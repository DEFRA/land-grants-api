import mongoose from 'mongoose'
import { getEnabledActions } from '~/src/api/actions/queries/getActions.query.js'
import actionModel from '../api/actions/models/action.model.js'
import actions from '../api/common/helpers/seed-data/action-data.js'

const logger = {
  info: jest.fn(),
  error: jest.fn()
}

describe('Get actions', () => {
  beforeAll(async () => {
    await mongoose.connect(
      `mongodb://${process.env.MONGO_HOST}:${process.env.MONGO_PORT}`,
      {
        dbName: 'land-grants-api'
      }
    )

    try {
      await actionModel.db.dropCollection('action-data')
    } catch (error) {
      // Ignore error if collection doesn't exist
      if (error.codeName !== 'NamespaceNotFound') {
        throw error
      }
    }
    await actionModel.insertMany(actions)
  })

  afterAll(async () => {
    await mongoose.disconnect()
  })

  test('should return all enabled actions', async () => {
    const actions = await getEnabledActions(logger)

    const actionCodes = actions.map((action) => action.code)

    expect(actionCodes).toEqual([
      'CMOR1',
      'UPL1',
      'UPL2',
      'UPL3',
      'SPM4',
      'SAM1',
      'OFM3'
    ])
  })
})
