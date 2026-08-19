import { getLfaInterceptPercentage } from './getLfaInterceptPercentage.js'

describe('getLfaInterceptPercentage', () => {
  let mockDb
  let mockLogger
  let mockClient
  let mockResult

  beforeEach(() => {
    mockResult = {
      rows: [
        {
          overlap_percent: 100
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

    await getLfaInterceptPercentage(sheetId, parcelId, mockDb, mockLogger)

    expect(mockDb.connect).toHaveBeenCalledTimes(1)
  })

  test('should query with the correct parameters', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    const expectedQuery = `
      WITH parcel AS (
        SELECT geom FROM land_parcels WHERE sheet_id = $1 AND parcel_id = $2
      ),
      lfa_union AS (
        SELECT ST_Union(m.geom) AS union_geom
        FROM data_layer m
        JOIN parcel p ON ST_Intersects(p.geom, m.geom)
        WHERE m.data_layer_type_id = 2
          AND m.metadata->>'ref_code' = ANY($3)
      )
      SELECT
        COALESCE(ST_Area(ST_Intersection(p.geom, u.union_geom))::float8, 0)
            / NULLIF(ST_Area(p.geom)::float8, 0) * 100 AS overlap_percent
      FROM parcel p
      LEFT JOIN lfa_union u ON true
    `

    const expectedValues = [sheetId, parcelId, ['D', 'S', 'M', 'MS', 'MD']]

    await getLfaInterceptPercentage(sheetId, parcelId, mockDb, mockLogger)

    expect(mockClient.query).toHaveBeenCalledWith(expectedQuery, expectedValues)
  })

  test('should return the LFA overlap percentage', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'

    const result = await getLfaInterceptPercentage(
      sheetId,
      parcelId,
      mockDb,
      mockLogger
    )

    expect(result).toBe(100)
  })

  test('should return partial overlap percentage', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    mockResult.rows[0].overlap_percent = 85.5

    const result = await getLfaInterceptPercentage(
      sheetId,
      parcelId,
      mockDb,
      mockLogger
    )

    expect(result).toBe(86)
  })

  test('should return 0 when no LFA overlap', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    mockResult.rows[0].overlap_percent = null

    const result = await getLfaInterceptPercentage(
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
    mockResult.rows = []

    const result = await getLfaInterceptPercentage(
      sheetId,
      parcelId,
      mockDb,
      mockLogger
    )

    expect(result).toBe(0)
  })

  test('should release the client when done', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'

    await getLfaInterceptPercentage(sheetId, parcelId, mockDb, mockLogger)

    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should handle errors and return 0', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    const error = new Error('Database error')
    mockClient.query = vi.fn().mockRejectedValue(error)

    const result = await getLfaInterceptPercentage(
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
        'Database operation failed: Get LFA intercept percentage'
      )
    )
    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should handle client release if client is not defined', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    mockDb.connect = vi.fn().mockRejectedValue(new Error('Connection error'))

    const result = await getLfaInterceptPercentage(
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
