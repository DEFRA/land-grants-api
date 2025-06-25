import compatibilityMatrixModel from '~/src/api/actions/models/compatibilityMatrix.model.js'
import { getCompatibilityMatrix } from '~/src/api/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
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

describe('Get compatibility matrix', () => {
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

  test('should return all optionCodes for code', async () => {
    const landCovers = await getCompatibilityMatrix(['CMOR1'], logger)
    expect(landCovers).toEqual(compatibilitycodes)
  })
})
