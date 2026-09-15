import { getLandUseCodesForParcel } from './getLandUseCodesForParcel.query.js'

describe('getLandUseCodesForParcel', () => {
  let mockDb
  let mockLogger
  let mockClient
  let mockResult

  beforeEach(() => {
    mockResult = {
      rows: [{ land_use_code: 'WF03' }, { land_use_code: 'WF01' }]
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

    await getLandUseCodesForParcel(sheetId, parcelId, mockDb, mockLogger)

    expect(mockDb.connect).toHaveBeenCalledTimes(1)
  })

  test('should query with the correct parcel', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    const expectedQuery = `SELECT DISTINCT
        cc.land_use_code
    FROM
    land_covers c
    INNER JOIN land_cover_codes cc ON cc.land_cover_class_code = c.land_cover_class_code
    WHERE
        c.sheet_id = $1
    AND c.parcel_id = $2`
    const expectedValues = [sheetId, parcelId]

    await getLandUseCodesForParcel(sheetId, parcelId, mockDb, mockLogger)

    expect(mockClient.query).toHaveBeenCalledWith(expectedQuery, expectedValues)
  })

  test('should return the land use codes from the query results', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'

    const result = await getLandUseCodesForParcel(
      sheetId,
      parcelId,
      mockDb,
      mockLogger
    )

    expect(result).toEqual(['WF03', 'WF01'])
  })

  test('should return an empty array when there WS03e no matching rows', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    mockClient.query = vi.fn().mockResolvedValue({ rows: [] })

    const result = await getLandUseCodesForParcel(
      sheetId,
      parcelId,
      mockDb,
      mockLogger
    )

    expect(result).toEqual([])
  })

  test('should release the client when done', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'

    await getLandUseCodesForParcel(sheetId, parcelId, mockDb, mockLogger)

    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should log and return null when the query fails', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    const error = new Error('Connection error')
    mockClient.query = vi.fn().mockRejectedValue(error)

    const result = await getLandUseCodesForParcel(
      sheetId,
      parcelId,
      mockDb,
      mockLogger
    )

    expect(result).toBeNull()
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Connection error'
        }),
        event: expect.objectContaining({
          action: 'Get land use codes for parcel',
          category: 'database',
          type: 'error'
        })
      }),
      expect.stringContaining(
        'Database operation failed: Get land use codes for parcel'
      )
    )
    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should return null and not release the client if connect fails', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    mockDb.connect = vi.fn().mockRejectedValue(new Error('Connection error'))

    const result = await getLandUseCodesForParcel(
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
