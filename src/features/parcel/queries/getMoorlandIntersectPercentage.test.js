import { getMoorlandIntersectPercentage } from './getMoorlandIntersectPercentage.js'
import { DATA_LAYER_TYPES } from '~/src/features/data-layers/queries/getDataLayer.query.js'

describe('getMoorlandIntersectPercentage', () => {
  let mockDb
  let mockLogger
  let mockClient
  let mockResult

  beforeEach(() => {
    mockResult = {
      rows: [
        {
          overlap_percent: 50
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

    await getMoorlandIntersectPercentage(sheetId, parcelId, mockDb, mockLogger)

    expect(mockDb.connect).toHaveBeenCalledTimes(1)
  })

  test('should query with the correct parameters', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    const expectedQuery = `
      WITH parcel AS (
        SELECT geom FROM land_parcels WHERE sheet_id = $1 AND parcel_id = $2
      ),
      dl_clipped AS (
        SELECT ST_Intersection(p.geom, dl.geom) AS geom
        FROM data_layer dl
        JOIN parcel p ON ST_Intersects(p.geom, dl.geom)
        WHERE dl.data_layer_type_id = $4
          AND dl.metadata->>'ref_code' = ANY($3)
      ),
      dl_union AS (
        SELECT ST_Union(geom) AS union_geom FROM dl_clipped
      )
      SELECT
        COALESCE(ST_Area(u.union_geom)::float8, 0)
            / NULLIF(ST_Area(p.geom)::float8, 0) * 100 AS overlap_percent
      FROM parcel p
      LEFT JOIN dl_union u ON true
    `

    const expectedValues = [
      sheetId,
      parcelId,
      ['M', 'MS', 'MD'],
      DATA_LAYER_TYPES.less_favoured_areas
    ]

    await getMoorlandIntersectPercentage(sheetId, parcelId, mockDb, mockLogger)

    expect(mockClient.query).toHaveBeenCalledWith(expectedQuery, expectedValues)
  })

  test('should return the moorland overlap percentage', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'

    const result = await getMoorlandIntersectPercentage(
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
    mockResult.rows[0].overlap_percent = null

    const result = await getMoorlandIntersectPercentage(
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

    const result = await getMoorlandIntersectPercentage(
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

    await getMoorlandIntersectPercentage(sheetId, parcelId, mockDb, mockLogger)

    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should handle errors and return null', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    const error = new Error('Database error')
    mockClient.query = vi.fn().mockRejectedValue(error)

    const result = await getMoorlandIntersectPercentage(
      sheetId,
      parcelId,
      mockDb,
      mockLogger
    )

    expect(result).toBeNull()
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
        'Database operation failed: Get moorland intersect percentage'
      )
    )
    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should handle client release if client is not defined', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    mockDb.connect = vi.fn().mockRejectedValue(new Error('Connection error'))

    const result = await getMoorlandIntersectPercentage(
      sheetId,
      parcelId,
      mockDb,
      mockLogger
    )

    expect(result).toBeNull()
    expect(mockLogger.error).toHaveBeenCalled()
    expect(mockClient.release).not.toHaveBeenCalled()
  })
})
