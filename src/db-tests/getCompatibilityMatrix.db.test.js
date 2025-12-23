import { getCompatibilityMatrix } from '~/src/api/compatibility-matrix/queries/getCompatibilityMatrix.query.js'

import { connectToTestDatbase } from '~/src/db-tests/setup/postgres.js'
import { vi } from 'vitest'

describe('Get compatibility matrix', () => {
  let logger, connection
    
  beforeAll(() => {
    logger = {
      info: vi.fn(),
      error: vi.fn()
    }
    connection = connectToTestDatbase()
  })

  afterAll(async () => {
    await connection.end()
  })

  test('should return all optionCodes for code', async () => {
    const landCovers = await getCompatibilityMatrix(logger, connection, [
      'CMOR1'
    ])
    const filteredResult = landCovers.filter(
      (landCover) => landCover.optionCode === 'CMOR1'
    )
    expect(landCovers).toEqual(filteredResult)
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
