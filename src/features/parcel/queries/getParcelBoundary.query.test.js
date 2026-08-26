import { getLandParcelBoundary } from '~/src/features/parcel/queries/getParcelBoundary.query.js'

describe('getLandParcelBoundary', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn()
  }

  const mockClient = {
    query: vi.fn(),
    release: vi.fn()
  }

  const mockDb = {
    connect: vi.fn()
  }

  const testSheetId = 'SH123'
  const testParcelId = '9456'

  const expectedQuery = `SELECT
        round(st_length(ST_ExteriorRing(geom))) as boundary_length_meters
      FROM land_parcels
      WHERE sheet_id = $1 and parcel_id = $2`

  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.connect.mockResolvedValue(mockClient)
  })

  describe('successful data retrieval', () => {
    it('should return the boundary length when a single parcel is found', async () => {
      mockClient.query.mockResolvedValue({
        rows: [{ boundary_length_meters: 250 }]
      })

      const result = await getLandParcelBoundary(
        testSheetId,
        testParcelId,
        mockDb,
        mockLogger
      )

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.query).toHaveBeenCalledWith(expectedQuery, [
        testSheetId,
        testParcelId
      ])
      expect(mockClient.release).toHaveBeenCalledTimes(1)
      expect(result).toEqual({ boundaryLengthMeters: 250 })
    })
  })

  describe('error handling', () => {
    it('should return null and log an error when no parcel is found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      const result = await getLandParcelBoundary(
        testSheetId,
        testParcelId,
        mockDb,
        mockLogger
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Land parcel not found'
          })
        }),
        expect.stringContaining(
          'Database operation failed: Get the boundary for parcel'
        )
      )
      expect(mockClient.release).toHaveBeenCalledTimes(1)
      expect(result).toBeNull()
    })

    it('should return null and log an error when multiple parcels are found', async () => {
      mockClient.query.mockResolvedValue({
        rows: [{ boundary_length_meters: 250 }, { boundary_length_meters: 300 }]
      })

      const result = await getLandParcelBoundary(
        testSheetId,
        testParcelId,
        mockDb,
        mockLogger
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Land parcel not found'
          })
        }),
        expect.stringContaining(
          'Database operation failed: Get the boundary for parcel'
        )
      )
      expect(result).toBeNull()
    })

    it('should handle database connection error', async () => {
      const connectionError = new Error('Database connection failed')
      mockDb.connect.mockRejectedValue(connectionError)

      const result = await getLandParcelBoundary(
        testSheetId,
        testParcelId,
        mockDb,
        mockLogger
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Database connection failed'
          })
        }),
        expect.stringContaining(
          'Database operation failed: Get the boundary for parcel'
        )
      )
      expect(mockClient.release).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })

    it('should handle query execution error', async () => {
      const queryError = new Error('Query execution failed')
      mockClient.query.mockRejectedValue(queryError)

      const result = await getLandParcelBoundary(
        testSheetId,
        testParcelId,
        mockDb,
        mockLogger
      )

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Query execution failed'
          })
        }),
        expect.stringContaining(
          'Database operation failed: Get the boundary for parcel'
        )
      )
      expect(mockClient.release).toHaveBeenCalledTimes(1)
      expect(result).toBeNull()
    })

    it('should release client even when query fails', async () => {
      const queryError = new Error('Query execution failed')
      mockClient.query.mockRejectedValue(queryError)

      await getLandParcelBoundary(testSheetId, testParcelId, mockDb, mockLogger)

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    it('should handle case when client is null', async () => {
      mockDb.connect.mockResolvedValue(null)

      const result = await getLandParcelBoundary(
        testSheetId,
        testParcelId,
        mockDb,
        mockLogger
      )

      expect(mockClient.release).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })
  })

  describe('parameter validation', () => {
    it('should handle different parameter types correctly', async () => {
      const numericSheetId = 123
      const numericParcelId = 456
      mockClient.query.mockResolvedValue({
        rows: [{ boundary_length_meters: 100 }]
      })

      const result = await getLandParcelBoundary(
        numericSheetId,
        numericParcelId,
        mockDb,
        mockLogger
      )

      expect(mockClient.query).toHaveBeenCalledWith(expectedQuery, [
        numericSheetId,
        numericParcelId
      ])
      expect(result).toEqual({ boundaryLengthMeters: 100 })
    })

    it('should handle null/undefined parameters', async () => {
      mockClient.query.mockResolvedValue({
        rows: [{ boundary_length_meters: null }]
      })

      const result = await getLandParcelBoundary(
        null,
        undefined,
        mockDb,
        mockLogger
      )

      expect(mockClient.query).toHaveBeenCalledWith(expectedQuery, [
        null,
        undefined
      ])
      expect(result).toEqual({ boundaryLengthMeters: null })
    })
  })
})
