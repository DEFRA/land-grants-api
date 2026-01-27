import { vi } from 'vitest'
import { getDataLayerQuery, dataLayerQuery } from './getDataLayer.query.js'

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

    await getDataLayerQuery(sheetId, parcelId, mockDb, mockLogger)

    expect(mockDb.connect).toHaveBeenCalledTimes(1)
  })

  test('should query with the correct parameters', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    const expectedValues = [sheetId, parcelId]

    await getDataLayerQuery(sheetId, parcelId, mockDb, mockLogger)

    expect(mockClient.query).toHaveBeenCalledWith(
      dataLayerQuery,
      expectedValues
    )
  })

  test('should return the overlap percentage', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'

    const result = await getDataLayerQuery(
      sheetId,
      parcelId,
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
    mockResult.rows[0].overlap_percent = null
    mockResult.rows[0].sqm = null

    const result = await getDataLayerQuery(
      sheetId,
      parcelId,
      mockDb,
      mockLogger
    )

    expect(result).toStrictEqual({
      intersectingAreaPercentage: 0,
      intersectionAreaHa: 0
    })
  })

  test('should release the client when done', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'

    await getDataLayerQuery(sheetId, parcelId, mockDb, mockLogger)

    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should handle errors and return 0', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    const error = new Error('Database error')
    mockClient.query = vi.fn().mockRejectedValue(error)

    const result = await getDataLayerQuery(
      sheetId,
      parcelId,
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
    mockDb.connect = vi.fn().mockRejectedValue(new Error('Connection error'))

    const result = await getDataLayerQuery(
      sheetId,
      parcelId,
      mockDb,
      mockLogger
    )

    expect(result).toBe(0)
    expect(mockLogger.error).toHaveBeenCalled()
    expect(mockClient.release).not.toHaveBeenCalled()
  })
})
