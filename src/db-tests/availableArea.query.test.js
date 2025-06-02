import { getParcelAvailableArea } from '../api/land/queries/getParcelAvailableArea.query.js'
import {
  connectToTestDatbase,
  resetDatabase,
  seedDatabase
} from './test-db-utils.js'

let connection

const logger = {
  info: console.info,
  error: console.error
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

  test('Get parcel available area', async () => {
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

    try {
      // const result = await connection.query('select 1 + 1 as result')
      // get value from the result

      console.log(availableArea)
      expect(availableArea).toBe(2112.29)
    } catch (error) {
      console.error('Error executing query:', error)
      if (error.errors && Array.isArray(error.errors)) {
        error.errors.forEach((err) => console.error(err.message))
      }

      throw error
    }

    // const availableArea = await getParcelAvailableArea(
    //   'SD7565',
    //   '6976',
    //   ['130', '131'],
    //   connection,
    //   logger
    // )
  })
})
