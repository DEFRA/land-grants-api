import compatibilityMatrixModel from '~/src/api/compatibility-matrix/models/compatibilityMatrix.model.js'
import { getCompatibilityMatrix } from '~/src/api/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
import {
  closeMongo,
  connectMongo,
  seedMongo
} from '~/src/db-tests/setup/utils.js'
import compatibilityMatrix from '../api/common/helpers/seed-data/compatibility-matrix.js'

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
  }, 60000)

  afterAll(async () => {
    await closeMongo()
  })

  test('should return all optionCodes for code', async () => {
    const landCovers = await getCompatibilityMatrix(logger, ['CMOR1'])
    const filteredResult = landCovers.filter(
      (landCover) => landCover.optionCode === 'CMOR1'
    )
    expect(landCovers).toEqual(filteredResult)
  })

  test('should return all optionCodes when no codes are provided', async () => {
    const landCovers = await getCompatibilityMatrix(logger)
    expect(landCovers).toHaveLength(compatibilityMatrix.length)
  })
})
