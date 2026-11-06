import { getCompatibilityMatrix } from '~/src/features/compatibility-matrix/queries/getCompatibilityMatrix.query.js'

import { connectToTestDatabase } from '~/src/tests/db-tests/setup/postgres.js'
import {
  clearCompatibilityMatrix,
  seedCompatibilityMatrix
} from '~/src/tests/db-tests/setup/compatibility-matrix.js'

const SOURCE = 'getCompatibilityMatrix.db.test'

describe('Get Compatibility Matrix Query', () => {
  let logger, connection

  beforeAll(async () => {
    logger = {
      info: vi.fn(),
      error: vi.fn()
    }
    connection = connectToTestDatabase()
    await seedCompatibilityMatrix(connection, SOURCE, [
      ['CMOR1', 'UPL1'],
      ['UPL1', 'CMOR1'],
      ['UPL1', 'UPL2'],
      ['UPL2', 'UPL1']
    ])
  })

  afterAll(async () => {
    await clearCompatibilityMatrix(connection, SOURCE)
    await connection.end()
  })

  test('should return all optionCodes for code', async () => {
    const landCovers = await getCompatibilityMatrix(logger, connection, [
      'CMOR1'
    ])

    expect(landCovers.length).toBeGreaterThan(0)
    expect(landCovers.every((l) => l.optionCode === 'CMOR1')).toBe(true)
  })

  test('should return all optionCodes when no codes are provided', async () => {
    const landCovers = await getCompatibilityMatrix(logger, connection)

    expect(
      landCovers.filter((l) => l.optionCode === 'UPL1').length
    ).toBeGreaterThan(0)
    expect(
      landCovers.filter((l) => l.optionCode === 'UPL2').length
    ).toBeGreaterThan(0)
  })
})
