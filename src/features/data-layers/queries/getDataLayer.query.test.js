import { vi } from 'vitest'
import {
  getDataLayerQuery,
  DATA_LAYER_QUERY_TYPES,
  accumulatedIntersectionAreaQuery,
  largestIntersectionAreaQuery
} from './getDataLayer.query.js'

describe('getDataLayerQuery', () => {
  let mockDb
  let mockLogger
  let mockClient
  let mockResult

  beforeEach(() => {
    mockResult = {
      rows: [
        {
          overlap_percent: 50,
          sqm: 1000
        }
      ]
    }

    mockClient = {
      query: vi.fn().mockResolvedValue(mockResult),
      release: vi.fn()
    }

    mockDb = {
      connect: vi.fn().mockResolvedValue(mockClient)
    }

    mockLogger = {
      info: vi.fn(),
      error: vi.fn()
    }
  })

  test('should connect to the database', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    const dataLayerTypeId = 1

    await getDataLayerQuery(
      sheetId,
      parcelId,
      dataLayerTypeId,
      DATA_LAYER_QUERY_TYPES.accumulated,
      mockDb,
      mockLogger
    )

    expect(mockDb.connect).toHaveBeenCalledTimes(1)
  })

  test('should use accumulated query when queryType is accumulated', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    const dataLayerTypeId = 1
    const expectedValues = [sheetId, parcelId, dataLayerTypeId]

    await getDataLayerQuery(
      sheetId,
      parcelId,
      dataLayerTypeId,
      DATA_LAYER_QUERY_TYPES.accumulated,
      mockDb,
      mockLogger
    )

    expect(mockClient.query).toHaveBeenCalledWith(
      accumulatedIntersectionAreaQuery,
      expectedValues
    )
  })

  test('should use largest query when queryType is largest', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    const dataLayerTypeId = 1
    const expectedValues = [sheetId, parcelId, dataLayerTypeId]

    await getDataLayerQuery(
      sheetId,
      parcelId,
      dataLayerTypeId,
      DATA_LAYER_QUERY_TYPES.largest,
      mockDb,
      mockLogger
    )

    expect(mockClient.query).toHaveBeenCalledWith(
      largestIntersectionAreaQuery,
      expectedValues
    )
  })

  test('should return the overlap percentage', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    const dataLayerTypeId = 1

    const result = await getDataLayerQuery(
      sheetId,
      parcelId,
      dataLayerTypeId,
      DATA_LAYER_QUERY_TYPES.accumulated,
      mockDb,
      mockLogger
    )

    expect(result).toStrictEqual({
      intersectingAreaPercentage: 50,
      intersectionAreaHa: 0.1
    })
  })

  test('should return 0 when no overlap', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    const dataLayerTypeId = 1
    mockResult.rows = []

    const result = await getDataLayerQuery(
      sheetId,
      parcelId,
      dataLayerTypeId,
      DATA_LAYER_QUERY_TYPES.accumulated,
      mockDb,
      mockLogger
    )

    expect(result).toBe(0)
  })

  test('should release the client when done', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    const dataLayerTypeId = 1

    await getDataLayerQuery(
      sheetId,
      parcelId,
      dataLayerTypeId,
      DATA_LAYER_QUERY_TYPES.accumulated,
      mockDb,
      mockLogger
    )

    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should handle errors and return 0', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    const dataLayerTypeId = 1
    const error = new Error('Database error')
    mockClient.query = vi.fn().mockRejectedValue(error)

    const result = await getDataLayerQuery(
      sheetId,
      parcelId,
      dataLayerTypeId,
      DATA_LAYER_QUERY_TYPES.accumulated,
      mockDb,
      mockLogger
    )

    expect(result).toBe(0)
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Database error'
        }),
        event: expect.objectContaining({
          category: 'database'
        })
      }),
      expect.stringContaining('Database operation failed: Get data layer query')
    )
    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should handle client release if client is not defined', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    const dataLayerTypeId = 1
    mockDb.connect = vi.fn().mockRejectedValue(new Error('Connection error'))

    const result = await getDataLayerQuery(
      sheetId,
      parcelId,
      dataLayerTypeId,
      DATA_LAYER_QUERY_TYPES.accumulated,
      mockDb,
      mockLogger
    )

    expect(result).toBe(0)
    expect(mockLogger.error).toHaveBeenCalled()
    expect(mockClient.release).not.toHaveBeenCalled()
  })
})
