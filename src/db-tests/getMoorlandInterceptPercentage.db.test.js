/* eslint-disable no-console */

import { getMoorlandInterceptPercentage } from '../api/parcel/queries/getMoorlandInterceptPercentage.js'
import { connectToTestDatbase } from './setup/postgres.js'

let connection

const logger = {
  info: jest.fn(),
  error: jest.fn()
}

describe('Get moorland intercept percentage query', () => {
  beforeAll(() => {
    connection = connectToTestDatbase()
  })

  afterAll(async () => {
    await connection.end()
  })

  test('when large amount of moorland and sheet_id = SD5642 AND parcel_id = 9903', async () => {
    const sheetId = 'SD5642'
    const parcelId = '9903'

    const result = await getMoorlandInterceptPercentage(
      sheetId,
      parcelId,
      connection,
      logger
    )

    expect(result).toBe(99)
  })

  test('when tiny amount of moorland and sheet_id = SD5942 AND parcel_id = 2744', async () => {
    const sheetId = 'SD5942'
    const parcelId = '2744'

    const result = await getMoorlandInterceptPercentage(
      sheetId,
      parcelId,
      connection,
      logger
    )

    expect(result).toBe(0)
  })

  test('when large ammount of moorland and sheet_id = SD4964 AND parcel_id = 7210', async () => {
    const sheetId = 'SD4964'
    const parcelId = '7210'

    const result = await getMoorlandInterceptPercentage(
      sheetId,
      parcelId,
      connection,
      logger
    )

    expect(result).toBe(96)
  })

  test('when small ammount of moorland and sheet_id = SD6743 AND parcel_id = 5422', async () => {
    const sheetId = 'SD6743'
    const parcelId = '5422'

    const result = await getMoorlandInterceptPercentage(
      sheetId,
      parcelId,
      connection,
      logger
    )

    expect(result).toBe(32)
  })

  test('when full ammount of moorland and sheet_id = SD6743 AND parcel_id = 3385', async () => {
    const sheetId = 'SD6743'
    const parcelId = '3385'

    const result = await getMoorlandInterceptPercentage(
      sheetId,
      parcelId,
      connection,
      logger
    )

    expect(result).toBe(100)
  })

  test('when no moorland and sheet_id = SD6842 AND parcel_id = 0784', async () => {
    const sheetId = 'SD6842'
    const parcelId = '0784'

    const result = await getMoorlandInterceptPercentage(
      sheetId,
      parcelId,
      connection,
      logger
    )

    expect(result).toBe(0)
  })

  test('when sheet_id = SD6842 AND parcel_id = not found', async () => {
    const sheetId = 'SD6842'
    const parcelId = '1234'

    const result = await getMoorlandInterceptPercentage(
      sheetId,
      parcelId,
      connection,
      logger
    )

    expect(result).toBe(0)
  })

  test('when sheet id and parcel id not found', async () => {
    const sheetId = 'SD0000'
    const parcelId = '1234'

    const result = await getMoorlandInterceptPercentage(
      sheetId,
      parcelId,
      connection,
      logger
    )

    expect(result).toBe(0)
  })
})
