import { vi } from 'vitest'
import { getMoorlandInterceptPercentage } from '~/src/api/parcel/queries/getMoorlandInterceptPercentage.js'
import { connectToTestDatbase } from '~/src/db-tests/setup/postgres.js'

describe('Get Moorland Intercept Percentage Query', () => {
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

  test('when tiny amount of moorland and sheet_id = SD7324 AND parcel_id = 7862 and ref_code = M', async () => {
    const sheetId = 'SD7324'
    const parcelId = '7862'

    const result = await getMoorlandInterceptPercentage(
      sheetId,
      parcelId,
      connection,
      logger
    )

    expect(result).toBe(1)
  })

  test('when large enough ammount of moorland and sheet_id = SD6164 AND parcel_id = 6108 and ref_code = M', async () => {
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

  test('when full ammount of moorland and sheet_id = SD5649 AND parcel_id = 9215 and ref_code = M', async () => {
    const sheetId = 'SD5649'
    const parcelId = '9215'

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
