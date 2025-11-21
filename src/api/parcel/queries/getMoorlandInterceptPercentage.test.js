import { getMoorlandInterceptPercentage } from './getMoorlandInterceptPercentage.js'

describe('getMoorlandInterceptPercentage', () => {
  let mockDb
  let mockLogger
  let mockClient
  let mockExceptionResult
  let mockPercentageResult

  beforeEach(() => {
    mockExceptionResult = {
      rows: []
    }

    mockPercentageResult = {
      rows: [
        {
          sheet_id: 'SH123',
          parcel_id: 'PA456',
          parcel_area_m2: 1000,
          moorland_overlap_m2: 500,
          moorland_overlap_percent: 50
        }
      ]
    }

    mockClient = {
      query: jest
        .fn()
        .mockResolvedValueOnce(mockExceptionResult)
        .mockResolvedValueOnce(mockPercentageResult),
      release: jest.fn()
    }

    mockDb = {
      connect: jest.fn().mockResolvedValue(mockClient)
    }

    mockLogger = {
      info: jest.fn(),
      error: jest.fn()
    }
  })

  test('should connect to the database', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'

    await getMoorlandInterceptPercentage(sheetId, parcelId, mockDb, mockLogger)

    expect(mockDb.connect).toHaveBeenCalledTimes(1)
  })

  test('should first query moorland_exceptions table', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    const expectedExceptionQuery = `SELECT * FROM moorland_exceptions WHERE parcel_id = $1 AND sheet_id = $2`
    const expectedValues = [parcelId, sheetId]

    await getMoorlandInterceptPercentage(sheetId, parcelId, mockDb, mockLogger)

    expect(mockClient.query).toHaveBeenNthCalledWith(
      1,
      expectedExceptionQuery,
      expectedValues
    )
  })

  test('should query percentage with the correct parameters when no exception found', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    const expectedQuery = `
      SELECT
          COALESCE(SUM(ST_Area(ST_Intersection(p.geom, m.geom))::float8), 0)
              / NULLIF(ST_Area(p.geom)::float8, 0) * 100 AS moorland_overlap_percent
      FROM
          land_parcels p
      LEFT JOIN
          moorland_designations m
          ON ST_Intersects(p.geom, m.geom)
      WHERE
          p.sheet_id = $1 AND
          p.parcel_id = $2 AND
          m.ref_code LIKE 'M%'
      GROUP BY
          p.sheet_id, p.parcel_id, p.geom, m.ref_code;
    `

    const expectedValues = [sheetId, parcelId]

    await getMoorlandInterceptPercentage(sheetId, parcelId, mockDb, mockLogger)

    expect(mockClient.query).toHaveBeenNthCalledWith(
      2,
      expectedQuery,
      expectedValues
    )
  })

  describe('Exception scenarios', () => {
    test('should return 100 when parcel is in moorland_exceptions with ref_code starting with M', async () => {
      const sheetId = 'SH123'
      const parcelId = 'PA456'

      mockClient.query = jest.fn().mockResolvedValueOnce({
        rows: [
          {
            parcel_id: 'PA456',
            sheet_id: 'SH123',
            ref_code: 'M001'
          }
        ]
      })

      const result = await getMoorlandInterceptPercentage(
        sheetId,
        parcelId,
        mockDb,
        mockLogger
      )

      expect(result).toBe(100)
      expect(mockClient.query).toHaveBeenCalledTimes(1) // Only exception query, no percentage query
    })

    test('should return 0 when parcel is in moorland_exceptions with ref_code not starting with M', async () => {
      const sheetId = 'SH123'
      const parcelId = 'PA456'

      mockClient.query = jest.fn().mockResolvedValueOnce({
        rows: [
          {
            parcel_id: 'PA456',
            sheet_id: 'SH123',
            ref_code: 'E001'
          }
        ]
      })

      const result = await getMoorlandInterceptPercentage(
        sheetId,
        parcelId,
        mockDb,
        mockLogger
      )

      expect(result).toBe(0)
      expect(mockClient.query).toHaveBeenCalledTimes(1) // Only exception query, no percentage query
    })
  })

  describe('Normal percentage calculation', () => {
    test('should return the moorland overlap percentage', async () => {
      const sheetId = 'SH123'
      const parcelId = 'PA456'

      const result = await getMoorlandInterceptPercentage(
        sheetId,
        parcelId,
        mockDb,
        mockLogger
      )

      expect(result).toBe(50)
    })

    test('should return 0 when no moorland overlap', async () => {
      const sheetId = 'SH123'
      const parcelId = 'PA456'

      mockClient.query = jest
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ moorland_overlap_percent: null }]
        })

      const result = await getMoorlandInterceptPercentage(
        sheetId,
        parcelId,
        mockDb,
        mockLogger
      )

      expect(result).toBe(0)
    })

    test('should return 0 when query returns no rows', async () => {
      const sheetId = 'SH123'
      const parcelId = 'PA456'

      mockClient.query = jest
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })

      const result = await getMoorlandInterceptPercentage(
        sheetId,
        parcelId,
        mockDb,
        mockLogger
      )

      expect(result).toBe(0)
    })

    test('should return the maximum percentage when multiple rows returned', async () => {
      const sheetId = 'SH123'
      const parcelId = 'PA456'

      mockClient.query = jest
        .fn()
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            { moorland_overlap_percent: 25.5 },
            { moorland_overlap_percent: 75.8 },
            { moorland_overlap_percent: 50.2 }
          ]
        })

      const result = await getMoorlandInterceptPercentage(
        sheetId,
        parcelId,
        mockDb,
        mockLogger
      )

      expect(result).toBe(76) // rounded from 75.8 by roundSqm
    })
  })

  describe('Client management', () => {
    test('should release the client when done', async () => {
      const sheetId = 'SH123'
      const parcelId = 'PA456'

      await getMoorlandInterceptPercentage(
        sheetId,
        parcelId,
        mockDb,
        mockLogger
      )

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error handling', () => {
    test('should handle errors and return 0', async () => {
      const sheetId = 'SH123'
      const parcelId = 'PA456'
      const error = new Error('Database error')
      mockClient.query = jest.fn().mockRejectedValue(error)

      const result = await getMoorlandInterceptPercentage(
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
        expect.stringContaining(
          'Database operation failed: Get moorland intercept percentage'
        )
      )
      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should handle client release if client is not defined', async () => {
      const sheetId = 'SH123'
      const parcelId = 'PA456'
      mockDb.connect = jest
        .fn()
        .mockRejectedValue(new Error('Connection error'))

      const result = await getMoorlandInterceptPercentage(
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
})
