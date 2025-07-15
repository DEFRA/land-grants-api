import { getCompatibilityMatrix } from '~/src/api/compatibility-matrix/queries/getCompatibilityMatrix.query.js'

import {
  connectToTestDatbase,
  resetDatabase,
  seedPostgres
} from '~/src/db-tests/setup/postgres.js'

const logger = {
  info: jest.fn(),
  error: jest.fn()
}

let connection

describe('Get compatibility matrix', () => {
  beforeAll(async () => {
    connection = await connectToTestDatbase()
    await seedPostgres(connection, {
      compatibilityMatrix: true
    })
  }, 60000)

  afterAll(async () => {
    await resetDatabase(connection)
    await connection.end()
  })

  test('should return all optionCodes for code', async () => {
    const landCovers = await getCompatibilityMatrix(logger, connection, [
      'CMOR1'
    ])
    const filteredResult = landCovers.filter(
      (landCover) => landCover.option_code === 'CMOR1'
    )
    expect(landCovers).toEqual(filteredResult)
  })

  test('should return all optionCodes when no codes are provided', async () => {
    const landCovers = await getCompatibilityMatrix(logger, connection)
    expect(landCovers).toHaveLength(53535)
  })
})
