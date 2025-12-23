/* eslint-disable no-console */

import { mockActionConfig } from '../api/actions/fixtures/index.js'
import { getParcelAvailableArea } from '../api/parcel/queries/getParcelAvailableArea.query.js'
import { connectToTestDatbase } from './setup/postgres.js'
import { vi } from 'vitest'

describe('Available Area query', () => {
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
      new Set(
        mockActionConfig[0].landCoverClassCodes.concat(['131', '241', '243'])
      )
    )

    const availableArea = await getParcelAvailableArea(
      sheetId,
      parcelId,
      landCoverCodes,
      connection,
      logger
    )

    expect(availableArea).toBe(5417)
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

    expect(availableArea).toBe(5703)
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
