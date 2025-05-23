import { getLandCoversByParcelId } from '~/src/api/land-covers/queries/getLandCoversByParcelId.query.js'

describe('getLandCoversByParcelId', () => {
  let mockDb
  let mockLogger
  let mockClient
  let mockResult

  beforeEach(() => {
    mockResult = {
      rows: [
        { id: 1, sheet_id: 'SH123', parcel_id: 'PA456', cover_type: 'Grass' },
        { id: 2, sheet_id: 'SH123', parcel_id: 'PA456', cover_type: 'Trees' }
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

    await getLandCoversByParcelId(sheetId, parcelId, mockDb, mockLogger)

    expect(mockDb.connect).toHaveBeenCalledTimes(1)
  })

  test('should query with the correct parameters', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    const expectedQuery =
      'select * from land.land_covers where sheet_id = $1 and parcel_id = $2'
    const expectedValues = [sheetId, parcelId]

    await getLandCoversByParcelId(sheetId, parcelId, mockDb, mockLogger)

    expect(mockClient.query).toHaveBeenCalledWith(expectedQuery, expectedValues)
  })

  test('should return the query results', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'

    const result = await getLandCoversByParcelId(
      sheetId,
      parcelId,
      mockDb,
      mockLogger
    )

    expect(result).toEqual(mockResult.rows)
  })

  test('should release the client when done', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'

    await getLandCoversByParcelId(sheetId, parcelId, mockDb, mockLogger)

    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should handle errors and return undefined', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    const error = new Error('Database error')
    mockClient.query = jest.fn().mockRejectedValue(error)

    const result = await getLandCoversByParcelId(
      sheetId,
      parcelId,
      mockDb,
      mockLogger
    )

    expect(result).toBeUndefined()
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Error executing get land covers by parcel id query',
      error
    )
    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should handle client release if client is not defined', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    mockDb.connect = jest.fn().mockRejectedValue(new Error('Connection error'))

    const result = await getLandCoversByParcelId(
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
