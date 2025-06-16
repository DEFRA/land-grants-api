import { getMoorlandInterceptPercentage } from './getMoorlandInterceptPercentage.js'

describe('getMoorlandInterceptPercentage', () => {
  let mockDb
  let mockLogger
  let mockClient
  let mockResult

  beforeEach(() => {
    mockResult = {
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
      query: jest.fn().mockResolvedValue(mockResult),
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

  test('should query with the correct parameters', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    const expectedQuery = `
      SELECT
          p.sheet_id,
          p.parcel_id,
          ROUND(ST_Area(p.geom)::numeric, 2) AS parcel_area_m2,
          ROUND(
              COALESCE(SUM(ST_Area(ST_Intersection(p.geom, m.geom))::numeric), 0),
              2
          ) AS moorland_overlap_m2,
          ROUND(
              COALESCE(SUM(ST_Area(ST_Intersection(p.geom, m.geom))::numeric), 0)
              / NULLIF(ST_Area(p.geom)::numeric, 0) * 100,
              2
          ) AS moorland_overlap_percent
      FROM
          land_parcels p
      LEFT JOIN
          moorland_designations m
          ON ST_Intersects(p.geom, m.geom)
      WHERE
          p.sheet_id = $1 AND
          p.parcel_id = $2
      GROUP BY
          p.sheet_id, p.parcel_id, p.geom;
    `
    const expectedValues = [sheetId, parcelId]

    await getMoorlandInterceptPercentage(sheetId, parcelId, mockDb, mockLogger)

    expect(mockClient.query).toHaveBeenCalledWith(expectedQuery, expectedValues)
  })

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
    mockResult.rows[0].moorland_overlap_percent = null

    const result = await getMoorlandInterceptPercentage(
      sheetId,
      parcelId,
      mockDb,
      mockLogger
    )

    expect(result).toBe((0).toFixed(2))
  })

  test('should release the client when done', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'

    await getMoorlandInterceptPercentage(sheetId, parcelId, mockDb, mockLogger)

    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should handle errors and return undefined', async () => {
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

    expect(result).toBeUndefined()
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error executing get moorland intercept percentage query',
      error
    )
    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should handle client release if client is not defined', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    mockDb.connect = jest.fn().mockRejectedValue(new Error('Connection error'))

    const result = await getMoorlandInterceptPercentage(
      sheetId,
      parcelId,
      mockDb,
      mockLogger
    )

    expect(result).toBeUndefined()
    expect(mockLogger.error).toHaveBeenCalled()
    expect(mockClient.release).not.toHaveBeenCalled()
  })
})
