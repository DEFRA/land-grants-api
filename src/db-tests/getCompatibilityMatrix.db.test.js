import { getCompatibilityMatrix } from '~/src/api/compatibility-matrix/queries/getCompatibilityMatrix.query.js'

import { connectToTestDatbase } from '~/src/db-tests/setup/postgres.js'

const logger = {
  info: jest.fn(),
  error: jest.fn()
}

let connection

describe('Get compatibility matrix', () => {
  beforeAll(async () => {
    connection = await connectToTestDatbase()
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
