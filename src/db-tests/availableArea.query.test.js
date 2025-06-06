/* eslint-disable no-console */

import { getParcelAvailableArea } from '../api/land/queries/getParcelAvailableArea.query.js'
import {
  connectToTestDatbase,
  resetDatabase,
  seedDatabase
} from './setup/postgres.js'

let connection

const logger = {
  info: console.info,
  error: console.error
}

describe('Available Area query', () => {
  beforeAll(async () => {
    connection = await connectToTestDatbase()
    await seedDatabase(connection, 'availableArea.query.sql')
  })

  afterAll(async () => {
    await resetDatabase(connection)
    await connection.end()
  })

  test('should return available area when valid inputs', async () => {
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

  test('should return 0 available area when invalid landCoverClassCodes', async () => {
    const sheetId = 'SD7565'
    const parcelId = '6976'
    const landCoverClassCodes = []

    const availableArea = await getParcelAvailableArea(
      sheetId,
      parcelId,
      landCoverClassCodes,
      connection,
      logger
    )

    expect(availableArea).toBeDefined()
  })


  test('should return 7529.21 available area when all landCoverClassCodes in the system provided', async () => {
    const sheetId = 'SD7565'
    const parcelId = '6976'
    const landCoverClassCodes = ['631', '130', '131', '551', '131', '130', '551']

    const availableArea = await getParcelAvailableArea(
      sheetId,
      parcelId,
      landCoverClassCodes,
      connection,
      logger
    )

    expect(availableArea).toBe(7529.21)
  })

   test('should return 5702.54 available area when few landCoverClassCodes in the system provided', async () => {
    const sheetId = 'SD7565'
    const parcelId = '6976'
    const landCoverClassCodes = ['551', '131', '130', '551']

    const availableArea = await getParcelAvailableArea(
      sheetId,
      parcelId,
      landCoverClassCodes,
      connection,
      logger
    )

    expect(availableArea).toBe(5702.54)
  })

})
