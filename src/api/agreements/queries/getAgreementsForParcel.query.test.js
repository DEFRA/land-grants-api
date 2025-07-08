import { getAgreementsForParcel } from './getAgreementsForParcel.query.js'

describe('getAgreementsForParcel', () => {
  let mockDb
  let mockLogger
  let mockClient
  let mockResult

  beforeEach(() => {
    mockResult = {
      rows: [
        {
          id: 1,
          sheet_id: 'SH123',
          parcel_id: 'PA456',
          actions: [
            {
              action_code: 'UPL1',
              unit: 'ha',
              quantity: 0.5
            }
          ]
        },
        {
          id: 2,
          sheet_id: 'SH123',
          parcel_id: 'PA456',
          actions: [
            {
              action_code: 'CMOR1',
              unit: 'ha',
              quantity: 1.2
            }
          ]
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

    await getAgreementsForParcel(sheetId, parcelId, mockDb, mockLogger)

    expect(mockDb.connect).toHaveBeenCalledTimes(1)
  })

  test('should query with the correct parameters', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    const expectedQuery =
      'SELECT * FROM agreements WHERE sheet_id = $1 and parcel_id = $2'
    const expectedValues = [sheetId, parcelId]

    await getAgreementsForParcel(sheetId, parcelId, mockDb, mockLogger)

    expect(mockClient.query).toHaveBeenCalledWith(expectedQuery, expectedValues)
  })

  test('should return the query results', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'

    const result = await getAgreementsForParcel(
      sheetId,
      parcelId,
      mockDb,
      mockLogger
    )

    expect(result).toEqual(mockResult.rows)
  })

  test('should return empty array when no agreements found', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    mockResult.rows = []

    const result = await getAgreementsForParcel(
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

    await getAgreementsForParcel(sheetId, parcelId, mockDb, mockLogger)

    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should handle errors and return undefined', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    const error = new Error('Database error')
    mockClient.query = jest.fn().mockRejectedValue(error)

    const result = await getAgreementsForParcel(
      sheetId,
      parcelId,
      mockDb,
      mockLogger
    )

    expect(result).toBeUndefined()
    expect(mockLogger.error).toHaveBeenCalledWith(
      `Error executing get agreements query: Error: ${error.message}`
    )
    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should handle database connection error', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    const connectionError = new Error('Connection failed')
    mockDb.connect = jest.fn().mockRejectedValue(connectionError)

    const result = await getAgreementsForParcel(
      sheetId,
      parcelId,
      mockDb,
      mockLogger
    )

    expect(result).toBeUndefined()
    expect(mockLogger.error).toHaveBeenCalledWith(
      `Error executing get agreements query: Error: ${connectionError.message}`
    )
    expect(mockClient.release).not.toHaveBeenCalled()
  })

  test('should handle client release if client is not defined', async () => {
    const sheetId = 'SH123'
    const parcelId = 'PA456'
    mockDb.connect = jest.fn().mockRejectedValue(new Error('Connection error'))

    const result = await getAgreementsForParcel(
      sheetId,
      parcelId,
      mockDb,
      mockLogger
    )

    expect(result).toBeUndefined()
    expect(mockLogger.error).toHaveBeenCalled()
    expect(mockClient.release).not.toHaveBeenCalled()
  })

  test('should handle different parameter types correctly', async () => {
    const numericSheetId = 123
    const numericParcelId = 456

    await getAgreementsForParcel(
      numericSheetId,
      numericParcelId,
      mockDb,
      mockLogger
    )

    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT * FROM agreements WHERE sheet_id = $1 and parcel_id = $2',
      [numericSheetId, numericParcelId]
    )
  })

  test('should handle null/undefined parameters', async () => {
    const result = await getAgreementsForParcel(
      null,
      undefined,
      mockDb,
      mockLogger
    )

    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT * FROM agreements WHERE sheet_id = $1 and parcel_id = $2',
      [null, undefined]
    )
    expect(result).toEqual(mockResult.rows)
  })
})
