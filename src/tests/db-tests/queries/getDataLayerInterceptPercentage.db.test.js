import { vi } from 'vitest'
import {
  DATA_LAYER_TYPES,
  getDataLayerQueryAccumulated
} from '~/src/features/data-layers/queries/getDataLayer.query.js'
import { connectToTestDatbase } from '~/src/tests/db-tests/setup/postgres.js'

describe('Get Data Layer Intercept Percentage Query', () => {
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

  // Scenario 1: SSSI is in all land covers of a land parcel (UPL1/UPL2/UPL3)
  test('Scenario 1: when SSSI is in all land covers and sheet_id = TQ4530 AND parcel_id = 0522', async () => {
    const sheetId = 'TQ4530'
    const parcelId = '0522'
    const result = await getDataLayerQueryAccumulated(
      sheetId,
      parcelId,
      DATA_LAYER_TYPES.sssi,
      connection,
      logger
    )

    expect(result).toEqual({
      intersectingAreaPercentage: 100,
      intersectionAreaHa: 75.8101
    })
  })

  test('Scenario 1: when SSSI is in all land covers and sheet_id = TQ4432 AND parcel_id = 6044', async () => {
    const sheetId = 'TQ4432'
    const parcelId = '6044'
    const result = await getDataLayerQueryAccumulated(
      sheetId,
      parcelId,
      DATA_LAYER_TYPES.sssi,
      connection,
      logger
    )

    expect(result).toEqual({
      intersectingAreaPercentage: 98.81,
      intersectionAreaHa: 92.1933
    })
  })

  // Scenario 2: SSSI is in all land covers of a land parcel (CMOR1)
  test('Scenario 2: when SSSI is in all land covers for CMOR1 and sheet_id = TQ4530 AND parcel_id = 0522', async () => {
    const sheetId = 'TQ4530'
    const parcelId = '0522'
    const result = await getDataLayerQueryAccumulated(
      sheetId,
      parcelId,
      DATA_LAYER_TYPES.sssi,
      connection,
      logger
    )

    expect(result).toEqual({
      intersectingAreaPercentage: 100,
      intersectionAreaHa: 75.8101
    })
  })

  test('Scenario 2: when SSSI is in all land covers for CMOR1 and sheet_id = TQ4432 AND parcel_id = 6044', async () => {
    const sheetId = 'TQ4432'
    const parcelId = '6044'
    const result = await getDataLayerQueryAccumulated(
      sheetId,
      parcelId,
      DATA_LAYER_TYPES.sssi,
      connection,
      logger
    )

    expect(result).toEqual({
      intersectingAreaPercentage: 98.81,
      intersectionAreaHa: 92.1933
    })
  })

  // Scenario 3: SSSI is in all land covers of a land parcel (CMOR1 + UPL1)
  test('Scenario 3: when SSSI is in all land covers for CMOR1 + UPL1 and sheet_id = TQ4530 AND parcel_id = 0522', async () => {
    const sheetId = 'TQ4530'
    const parcelId = '0522'
    const result = await getDataLayerQueryAccumulated(
      sheetId,
      parcelId,
      DATA_LAYER_TYPES.sssi,
      connection,
      logger
    )

    expect(result).toEqual({
      intersectingAreaPercentage: 100,
      intersectionAreaHa: 75.8101
    })
  })

  test('Scenario 3: when SSSI is in all land covers for CMOR1 + UPL1 and sheet_id = TQ4432 AND parcel_id = 6044', async () => {
    const sheetId = 'TQ4432'
    const parcelId = '6044'
    const result = await getDataLayerQueryAccumulated(
      sheetId,
      parcelId,
      DATA_LAYER_TYPES.sssi,
      connection,
      logger
    )

    expect(result).toEqual({
      intersectingAreaPercentage: 98.81,
      intersectionAreaHa: 92.1933
    })
  })

  // Scenario 4: SSSI is not in any land covers of a land parcel
  test('Scenario 4: when SSSI is not in any land covers and sheet_id = TQ5039 AND parcel_id = 6856', async () => {
    const sheetId = 'TQ5039'
    const parcelId = '6856'
    const result = await getDataLayerQueryAccumulated(
      sheetId,
      parcelId,
      DATA_LAYER_TYPES.sssi,
      connection,
      logger
    )

    expect(result).toEqual({
      intersectingAreaPercentage: 0,
      intersectionAreaHa: 0
    })
  })

  test('Scenario 4: when SSSI is not in any land covers and sheet_id = TQ4441 AND parcel_id = 6801', async () => {
    const sheetId = 'TQ4441'
    const parcelId = '6801'
    const result = await getDataLayerQueryAccumulated(
      sheetId,
      parcelId,
      DATA_LAYER_TYPES.sssi,
      connection,
      logger
    )

    expect(result).toEqual({
      intersectingAreaPercentage: 0,
      intersectionAreaHa: 0
    })
  })

  // Scenario 5: SSSI is in land cover codes eligible for UPL1/UPL2/UPL3 but not in other land cover codes
  test('Scenario 5: when SSSI is in eligible land covers and sheet_id = SD2396 AND parcel_id = 0165', async () => {
    const sheetId = 'SD2396'
    const parcelId = '0165'
    const result = await getDataLayerQueryAccumulated(
      sheetId,
      parcelId,
      DATA_LAYER_TYPES.sssi,
      connection,
      logger
    )

    expect(result).toEqual({
      intersectingAreaPercentage: 6.44,
      intersectionAreaHa: 0.5404
    })
  })

  test('Scenario 5: when SSSI is in eligible land covers and sheet_id = NY1725 AND parcel_id = 8271', async () => {
    const sheetId = 'NY1725'
    const parcelId = '8271'
    const result = await getDataLayerQueryAccumulated(
      sheetId,
      parcelId,
      DATA_LAYER_TYPES.sssi,
      connection,
      logger
    )

    expect(result).toEqual({
      intersectingAreaPercentage: 19.01,
      intersectionAreaHa: 0.218
    })
  })

  // Scenario 6: SSSI is not in land cover codes eligible for UPL1/UPL2/UPL3 but is in other land cover codes
  test('Scenario 6: when SSSI is not in eligible land covers but in other covers and sheet_id = SU7226 AND parcel_id = 8761', async () => {
    const sheetId = 'SU7226'
    const parcelId = '8761'
    const result = await getDataLayerQueryAccumulated(
      sheetId,
      parcelId,
      DATA_LAYER_TYPES.sssi,
      connection,
      logger
    )

    expect(result).toEqual({
      intersectingAreaPercentage: 2.96,
      intersectionAreaHa: 0.0096
    })
  })

  // Scenario 7: SSSI intersection is less than 1% of a land parcel size
  test('Scenario 7: when SSSI intersection is less than 1% and sheet_id = SX1976 AND parcel_id = 3746', async () => {
    const sheetId = 'SX1976'
    const parcelId = '3746'
    const result = await getDataLayerQueryAccumulated(
      sheetId,
      parcelId,
      DATA_LAYER_TYPES.sssi,
      connection,
      logger
    )

    expect(result).toEqual({
      intersectingAreaPercentage: 0.9,
      intersectionAreaHa: 0.0064
    })
  })

  test('Scenario 7: when SSSI intersection is less than 1% and sheet_id = SP3875 AND parcel_id = 0438', async () => {
    const sheetId = 'SP3875'
    const parcelId = '0438'
    const result = await getDataLayerQueryAccumulated(
      sheetId,
      parcelId,
      DATA_LAYER_TYPES.sssi,
      connection,
      logger
    )

    expect(result).toEqual({
      intersectingAreaPercentage: 0.08,
      intersectionAreaHa: 0.0006
    })
  })
})
