import { getEnabledActions } from '~/src/api/actions/queries/getActions.query.js'
import actionModel from '../api/actions/models/action.model.js'
import actions from '../api/common/helpers/seed-data/action-data.js'
import {
  connectMongo,
  seedMongo,
  closeMongo
} from '~/src/db-tests/setup/utils.js'

const logger = {
  info: jest.fn(),
  error: jest.fn()
}

describe('Get actions', () => {
  beforeAll(async () => {
    await connectMongo()
    await seedMongo(actionModel, 'action-data', actions)
  })

  afterAll(async () => {
    await closeMongo()
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
