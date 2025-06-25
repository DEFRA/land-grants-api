import compatibilityMatrixModel from '~/src/api/actions/models/compatibilityMatrix.model.js'
import { calculateAvailableArea } from '~/src/available-area/index.js'
import compatibilityMatrix from '~/src/db-tests/fixtures/compatibility-matrix.json'
import { compatibilitycodes } from '~/src/db-tests/fixtures/compatibilityCodes.js'
import {
  connectMongo,
  seedMongo,
  closeMongo
} from '~/src/db-tests/setup/utils.js'

const logger = {
  info: jest.fn(),
  error: jest.fn()
}

describe('Calculate available area', () => {
  beforeAll(async () => {
    await connectMongo()
    await seedMongo(
      compatibilityMatrixModel,
      'compatibility-matrix',
      compatibilityMatrix
    )
  })

  afterAll(async () => {
    await closeMongo()
  })

  test('should return availableArea', async () => {
    const landCovers = await calculateAvailableArea(logger)
    expect(landCovers).toEqual(compatibilitycodes)
  })
})
