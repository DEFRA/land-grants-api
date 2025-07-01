import { getLandData } from '~/src/api/parcel/queries/getLandData.query.js'

describe('getLandData', () => {
  const mockLogger = {
    info: jest.fn(),
    error: jest.fn()
  }

  const mockClient = {
    query: jest.fn(),
    release: jest.fn()
  }

  const mockDb = {
    connect: jest.fn()
  }

  const testSheetId = 'test-sheet-123'
  const testParcelId = 'test-parcel-456'

  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.connect.mockResolvedValue(mockClient)
  })

  describe('successful data retrieval', () => {
    it('should return land data when found', async () => {
      const mockLandData = [
        {
          id: 1,
          sheet_id: testSheetId,
          parcel_id: testParcelId,
          area: 100.5,
          land_use: 'agricultural'
        },
        {
          id: 2,
          sheet_id: testSheetId,
          parcel_id: testParcelId,
          area: 50.2,
          land_use: 'forestry'
        }
      ]

      mockClient.query.mockResolvedValue({ rows: mockLandData })

      const result = await getLandData(
        testSheetId,
        testParcelId,
        mockDb,
        mockLogger
      )

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM land_parcels WHERE sheet_id = $1 and parcel_id = $2',
        [testSheetId, testParcelId]
      )
      expect(mockClient.release).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockLandData)
    })

    it('should return empty array when no data found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      const result = await getLandData(
        testSheetId,
        testParcelId,
        mockDb,
        mockLogger
      )

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM land_parcels WHERE sheet_id = $1 and parcel_id = $2',
        [testSheetId, testParcelId]
      )
      expect(mockClient.release).toHaveBeenCalledTimes(1)
      expect(result).toEqual([])
    })
  })

  describe('error handling', () => {
    it('should handle database connection error', async () => {
      const connectionError = new Error('Database connection failed')
      mockDb.connect.mockRejectedValue(connectionError)

      const result = await getLandData(
        testSheetId,
        testParcelId,
        mockDb,
        mockLogger
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error executing get Land parcels query: ${connectionError.toString()}`
      )
      expect(mockClient.release).not.toHaveBeenCalled()
      expect(result).toBeUndefined()
    })

    it('should handle query execution error', async () => {
      const queryError = new Error('Query execution failed')
      mockClient.query.mockRejectedValue(queryError)

      const result = await getLandData(
        testSheetId,
        testParcelId,
        mockDb,
        mockLogger
      )

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error executing get Land parcels query: ${queryError.toString()}`
      )
      expect(mockClient.release).toHaveBeenCalledTimes(1)
      expect(result).toBeUndefined()
    })

    it('should release client even when query fails', async () => {
      const queryError = new Error('Query execution failed')
      mockClient.query.mockRejectedValue(queryError)

      await getLandData(testSheetId, testParcelId, mockDb, mockLogger)

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    it('should handle case when client is null', async () => {
      mockDb.connect.mockResolvedValue(null)

      const result = await getLandData(
        testSheetId,
        testParcelId,
        mockDb,
        mockLogger
      )

      expect(mockClient.release).not.toHaveBeenCalled()
      expect(result).toBeUndefined()
    })
  })

  describe('parameter validation', () => {
    it('should handle different parameter types correctly', async () => {
      const numericSheetId = 123
      const numericParcelId = 456
      const mockLandData = [
        { id: 1, sheet_id: numericSheetId, parcel_id: numericParcelId }
      ]

      mockClient.query.mockResolvedValue({ rows: mockLandData })

      const result = await getLandData(
        numericSheetId,
        numericParcelId,
        mockDb,
        mockLogger
      )

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM land_parcels WHERE sheet_id = $1 and parcel_id = $2',
        [numericSheetId, numericParcelId]
      )
      expect(result).toEqual(mockLandData)
    })

    it('should handle null/undefined parameters', async () => {
      const mockLandData = []
      mockClient.query.mockResolvedValue({ rows: mockLandData })

      const result = await getLandData(null, undefined, mockDb, mockLogger)

      expect(mockClient.query).toHaveBeenCalledWith(
        'SELECT * FROM land_parcels WHERE sheet_id = $1 and parcel_id = $2',
        [null, undefined]
      )
      expect(result).toEqual(mockLandData)
    })
  })
})
