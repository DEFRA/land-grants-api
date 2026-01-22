/* eslint-disable no-console */

import { getDataLayerQuery } from '../../api/data-layers/queries/getDataLayer.query.js'
import { connectToTestDatbase } from '../setup/postgres.js'
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

  test('when large amount of data layer and sheet_id = SK0065 AND parcel_id = 7925', async () => {
    const sheetId = 'SK0065'
    const parcelId = '7925'
    const landCoverClassCodes = ['131']
    const result = await getDataLayerQuery(
      sheetId,
      parcelId,
      landCoverClassCodes,
      connection,
      logger
    )

    expect(result).toBe(96)
  })

  test('when small amount of data layer and sheet_id = SK0065 AND parcel_id = 6812', async () => {
    const sheetId = 'SK0065'
    const parcelId = '6812'
    const landCoverClassCodes = ['131', '243']
    const result = await getDataLayerQuery(
      sheetId,
      parcelId,
      landCoverClassCodes,
      connection,
      logger
    )

    expect(result).toBe(60)
  })

  test('when sheet_id = SD7324 AND parcel_id = not found', async () => {
    const sheetId = 'SD7324'
    const parcelId = '1234'
    const landCoverClassCodes = ['131']
    const result = await getDataLayerQuery(
      sheetId,
      parcelId,
      landCoverClassCodes,
      connection,
      logger
    )

    expect(result).toBe(0)
  })

  test('when sheet id and parcel id not found', async () => {
    const sheetId = 'SD0000'
    const parcelId = '1234'
    const landCoverClassCodes = ['131']
    const result = await getDataLayerQuery(
      sheetId,
      parcelId,
      landCoverClassCodes,
      connection,
      logger
    )

    expect(result).toBe(0)
  })
})
