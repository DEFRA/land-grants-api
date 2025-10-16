import { getLandCoversForParcel } from './getLandCoversForParcel.query.js'

describe('getLandCoversForParcel', () => {
  let mockDb
  let mockLogger
  let mockClient
  let mockResult

  beforeEach(() => {
    mockResult = {
      rows: [
        { area_sqm: 123, land_cover_class_code: 'Grass321' },
        { area_sqm: 456, land_cover_class_code: 'Trees543' },
        { area_sqm: 450.44, land_cover_class_code: 'Trees543' },
        { area_sqm: 450.54, land_cover_class_code: 'Trees543' }
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

    await getLandCoversForParcel(sheetId, parcelId, mockDb, mockLogger)

    expect(mockDb.connect).toHaveBeenCalledTimes(1)
  })

  test('should query with the correct parameters', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    const expectedQuery = `
        SELECT
          lc.land_cover_class_code, ST_Area(lc.geom) AS area_sqm
        FROM land_covers lc
        WHERE lc.sheet_id = $1
          AND lc.parcel_id = $2
        ORDER BY lc.land_cover_class_code, lc.area_sqm
    `
    const expectedValues = [sheetId, parcelId]

    await getLandCoversForParcel(sheetId, parcelId, mockDb, mockLogger)

    expect(mockClient.query).toHaveBeenCalledWith(expectedQuery, expectedValues)
  })

  test('should return the query results', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'

    const result = await getLandCoversForParcel(
      sheetId,
      parcelId,
      mockDb,
      mockLogger
    )

    expect(result).toEqual([
      { areaSqm: 123, landCoverClassCode: 'Grass321' },
      { areaSqm: 456, landCoverClassCode: 'Trees543' },
      { areaSqm: 450, landCoverClassCode: 'Trees543' },
      { areaSqm: 451, landCoverClassCode: 'Trees543' }
    ])
  })

  test('should release the client when done', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'

    await getLandCoversForParcel(sheetId, parcelId, mockDb, mockLogger)

    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should handle errors and return undefined', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    const error = new Error('Connection error')
    mockClient.query = jest.fn().mockRejectedValue(error)

    await expect(
      getLandCoversForParcel(sheetId, parcelId, mockDb, mockLogger)
    ).rejects.toThrow('Connection error')

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Connection error'
        }),
        event: expect.objectContaining({
          category: 'database',
          outcome: 'failure',
          reference: 'sheetId:SH123,parcelId:PA456'
        })
      }),
      expect.stringContaining(
        'Database operation failed: getLandCoversForParcel'
      )
    )
    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should handle client release if client is not defined', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    mockDb.connect = jest.fn().mockRejectedValue(new Error('Connection error'))

    await expect(
      getLandCoversForParcel(sheetId, parcelId, mockDb, mockLogger)
    ).rejects.toThrow('Connection error')

    expect(mockLogger.error).toHaveBeenCalled()
    expect(mockClient.release).not.toHaveBeenCalled()
  })
})
