/* eslint-disable no-console */

import { getMoorlandInterceptPercentage } from '../api/parcel/queries/getMoorlandInterceptPercentage.js'
import { connectToTestDatbase } from './setup/postgres.js'
import { vi } from 'vitest'

describe('Get moorland intercept percentage query', () => {
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

  test('when tiny amount of moorland and sheet_id = SD7348 AND parcel_id = 1554 and ref_code = M', async () => {
    const sheetId = 'SD7348'
    const parcelId = '1554'

    const result = await getMoorlandInterceptPercentage(
      sheetId,
      parcelId,
      connection,
      logger
    )

    expect(result).toBe(1)
  })

  test('when large enough ammount of moorland and sheet_id = SD7348 AND parcel_id = 0551 and ref_code = M', async () => {
    const sheetId = 'SD7348'
    const parcelId = '0551'

    const result = await getMoorlandInterceptPercentage(
      sheetId,
      parcelId,
      connection,
      logger
    )

    expect(result).toBe(50)
  })

  test('when full ammount of moorland and sheet_id = SD5148 AND parcel_id = 3580 and ref_code = M', async () => {
    const sheetId = 'SD5148'
    const parcelId = '3580'

    const result = await getMoorlandInterceptPercentage(
      sheetId,
      parcelId,
      connection,
      logger
    )

    expect(result).toBe(100)
  })

  test('when large amount of moorland and sheet_id = SD6164 AND parcel_id = 6108 and ref_code = M', async () => {
    const sheetId = 'SD6164'
    const parcelId = '6108'
    const result = await getMoorlandInterceptPercentage(
      sheetId,
      parcelId,
      connection,
      logger
    )

    expect(result).toBe(96)
  })

  test('when small ammount of moorland and sheet_id = SD6346 AND parcel_id = 8986 and ref_code = M', async () => {
    const sheetId = 'SD6346'
    const parcelId = '8986'

    const result = await getMoorlandInterceptPercentage(
      sheetId,
      parcelId,
      connection,
      logger
    )

    expect(result).toBe(10)
  })

  test('when no moorland and sheet_id = SD5358 AND parcel_id = 8678 and ref_code = M', async () => {
    const sheetId = 'SD5358'
    const parcelId = '8678'

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
