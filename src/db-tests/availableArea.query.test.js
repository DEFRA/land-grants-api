import { getParcelAvailableArea } from '../api/land/queries/getParcelAvailableArea.query.js'
import {
  connectToTestDatbase,
  resetDatabase,
  seedDatabase
} from './test-db-utils.js'

let connection

const logger = {
  info: jest.fn(),
  error: jest.fn()
}

describe('Postgres', () => {
  beforeAll(async () => {
    connection = await connectToTestDatbase()
  })

  beforeEach(async () => {
    await seedDatabase(connection)
  })

  afterEach(async () => {
    await resetDatabase(connection)
  })

  afterAll(async () => {
    await connection.end()
  })

  test('Get user by email', async () => {
    const sheetId = 'SD7565'
    const parcelId = '6976'
    const landCoverClassCodes = ['130', '131']

    const availableArea = await getParcelAvailableArea(
      sheetId,
      parcelId,
      landCoverClassCodes,
      connection,
      logger
    )

    expect(availableArea).toBeDefined()
  })
})
