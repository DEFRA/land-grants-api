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

    expect(availableArea).toBe(2112.29)
  })

  test('Get parcel available area 1', async () => {
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

    expect(availableArea).toBe(2112.29)
  })

  test('Get parcel available area 2', async () => {
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

    expect(availableArea).toBe(2112.29)
  })

  test('Get parcel available area 3', async () => {
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

    expect(availableArea).toBe(2112.29)
  })

  test('Get parcel available area 4', async () => {
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

    expect(availableArea).toBe(2112.29)
  })
})
