/* eslint-disable no-console */

import { mockActions } from '../api/actions/fixtures/index.js'
import { getParcelAvailableArea } from '../api/parcel/queries/getParcelAvailableArea.query.js'
import {
  connectToTestDatbase,
  resetDatabase,
  seedDatabase
} from './setup/postgres.js'

let connection

const logger = {
  info: jest.fn(),
  error: jest.fn()
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

  test('should return 0 available area when no landCoverClassCodes provided', async () => {
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

    expect(availableArea).toBe(0)
  })

  test('should return 0 available area when invalid landCoverClassCodes provided', async () => {
    const sheetId = 'SD7565'
    const parcelId = '6976'
    const landCoverClassCodes = ['0000', '9999']

    const availableArea = await getParcelAvailableArea(
      sheetId,
      parcelId,
      landCoverClassCodes,
      connection,
      logger
    )

    expect(availableArea).toBe(0)
  })

  test('should return 7529.21 available area when all landCoverClassCodes in the system provided', async () => {
    const sheetId = 'SD7565'
    const parcelId = '6976'
    const landCoverCodes = Array.from(
      new Set(mockActions[0].landCoverClassCodes.concat(['131', '241', '243']))
    )

    const availableArea = await getParcelAvailableArea(
      sheetId,
      parcelId,
      landCoverCodes,
      connection,
      logger
    )

    expect(availableArea).toBe(5417.028883865481)
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

    expect(availableArea).toBe(5702.543843742915)
  })

  test('should return 0 available area when sheetId not found in the system', async () => {
    const sheetId = 'UD00000'
    const parcelId = '6976'
    const landCoverClassCodes = ['551', '131', '130', '551']

    const availableArea = await getParcelAvailableArea(
      sheetId,
      parcelId,
      landCoverClassCodes,
      connection,
      logger
    )

    expect(availableArea).toBe(0)
  })

  test('should return 0 available area when parcelId not found in the system', async () => {
    const sheetId = 'SD7565'
    const parcelId = '0000'
    const landCoverClassCodes = ['551', '131', '130', '551']

    const availableArea = await getParcelAvailableArea(
      sheetId,
      parcelId,
      landCoverClassCodes,
      connection,
      logger
    )

    expect(availableArea).toBe(0)
  })
})
