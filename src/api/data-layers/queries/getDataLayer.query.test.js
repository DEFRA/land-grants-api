import { getDataLayerQuery } from './getDataLayer.query.js'

describe('getDataLayerQuery', () => {
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

    await getDataLayerQuery(sheetId, parcelId, mockDb, mockLogger)

    expect(mockDb.connect).toHaveBeenCalledTimes(1)
  })

  test('should query with the correct parameters', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    const expectedQuery = `
      SELECT
          COALESCE(SUM(ST_Area(ST_Intersection(p.geom, d.geom))::float8), 0)
              / NULLIF(ST_Area(p.geom)::float8, 0) * 100 AS overlap_percent
      FROM
          land_parcels p
      LEFT JOIN
          data_layer d
          ON ST_Intersects(p.geom, d.geom)
      WHERE
          p.sheet_id = $1 AND
          p.parcel_id = $2
      GROUP BY
          p.sheet_id, p.parcel_id, p.geom;
    `

    const expectedValues = [sheetId, parcelId]

    await getDataLayerQuery(sheetId, parcelId, mockDb, mockLogger)

    expect(mockClient.query).toHaveBeenCalledWith(expectedQuery, expectedValues)
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

    expect(result).toBe(50)
  })

  test('should return 0 when no overlap', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    mockResult.rows[0].overlap_percent = null

    const result = await getDataLayerQuery(
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

    await getDataLayerQuery(sheetId, parcelId, mockDb, mockLogger)

    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should handle errors and return undefined', async () => {
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
