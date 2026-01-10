/* eslint-disable no-console */

import { getDataLayerQuery } from '../api/data-layers/queries/getDataLayer.query.js'
import { connectToTestDatbase } from './setup/postgres.js'
import { vi } from 'vitest'

describe('Get data layer intercept percentage query', () => {
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

  test('when large amount of data layer and sheet_id = SD7324 AND parcel_id = 4765', async () => {
    const sheetId = 'SD7324'
    const parcelId = '4765'
    const result = await getDataLayerQuery(
      sheetId,
      parcelId,
      connection,
      logger
    )

    expect(result).toBe(99)
  })

  test('when small amount of data layer and sheet_id = SD7348 AND parcel_id = 1554', async () => {
    const sheetId = 'SD7324'
    const parcelId = '8173'

    const result = await getDataLayerQuery(
      sheetId,
      parcelId,
      connection,
      logger
    )

    expect(result).toBe(24)
  })

  test('when sheet_id = SD7324 AND parcel_id = not found', async () => {
    const sheetId = 'SD7324'
    const parcelId = '1234'

    const result = await getDataLayerQuery(
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

    const result = await getDataLayerQuery(
      sheetId,
      parcelId,
      connection,
      logger
    )

    expect(result).toBe(0)
  })
})
