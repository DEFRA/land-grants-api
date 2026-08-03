import { getLandCoverDefinitions } from '~/src/features/land-cover-codes/queries/getLandCoverDefinitions.query.js'

describe('getLandCoverDefinitions', () => {
  let mockDb
  let mockLogger
  let mockClient
  let mockResult
  let testLandCoverCodes

  beforeEach(() => {
    testLandCoverCodes = ['110', '120', '130']

    // Mock database result with multiple rows
    mockResult = {
      rows: [
        {
          land_cover_type_code: 'AC',
          land_cover_type_description: 'Arable Cropland',
          land_cover_class_code: '110',
          land_cover_class_description: 'Cereals',
          land_cover_code: '111',
          land_cover_description: 'Wheat',
          land_use_code: 'AR',
          land_use_description: 'Arable'
        },
        {
          land_cover_type_code: 'AC',
          land_cover_type_description: 'Arable Cropland',
          land_cover_class_code: '110',
          land_cover_class_description: 'Cereals',
          land_cover_code: '112',
          land_cover_description: 'Barley',
          land_use_code: 'AR',
          land_use_description: 'Arable'
        },
        {
          land_cover_type_code: 'PG',
          land_cover_type_description: 'Permanent Grassland',
          land_cover_class_code: '120',
          land_cover_class_description: 'Grassland',
          land_cover_code: '121',
          land_cover_description: 'Permanent Pasture',
          land_use_code: 'GR',
          land_use_description: 'Grassland'
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
      warn: vi.fn(),
      error: vi.fn()
    }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('successful operation', () => {
    test('should connect to the database', async () => {
      await getLandCoverDefinitions(testLandCoverCodes, mockDb, mockLogger)

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
    })

    test('should execute SELECT query with correct SQL and parameters', async () => {
      await getLandCoverDefinitions(testLandCoverCodes, mockDb, mockLogger)

      const expectedQuery = `
      SELECT DISTINCT land_cover_type_code,
            land_cover_type_description,
            land_cover_class_code,
            land_cover_class_description,
            land_cover_code,
            land_cover_description,
            land_use_code,
            land_use_description
        FROM public.land_cover_codes
        WHERE land_cover_code = ANY ($1)
        OR land_cover_class_code = ANY ($1)`

      expect(mockClient.query).toHaveBeenCalledWith(expectedQuery, [
        testLandCoverCodes
      ])
    })

    test('should return transformed land cover definitions', async () => {
      const result = await getLandCoverDefinitions(
        testLandCoverCodes,
        mockDb,
        mockLogger
      )

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({
        landCoverCode: '111',
        landCoverClassCode: '110',
        landCoverTypeCode: 'AC',
        landCoverTypeDescription: 'Arable Cropland',
        landCoverClassDescription: 'Cereals',
        landCoverDescription: 'Wheat'
      })
      expect(result[1]).toEqual({
        landCoverCode: '112',
        landCoverClassCode: '110',
        landCoverTypeCode: 'AC',
        landCoverTypeDescription: 'Arable Cropland',
        landCoverClassDescription: 'Cereals',
        landCoverDescription: 'Barley'
      })
      expect(result[2]).toEqual({
        landCoverCode: '121',
        landCoverClassCode: '120',
        landCoverTypeCode: 'PG',
        landCoverTypeDescription: 'Permanent Grassland',
        landCoverClassDescription: 'Grassland',
        landCoverDescription: 'Permanent Pasture'
      })
    })

    test('should release the client after successful operation', async () => {
      await getLandCoverDefinitions(testLandCoverCodes, mockDb, mockLogger)

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should handle single land cover code', async () => {
      const singleCode = ['110']

      await getLandCoverDefinitions(singleCode, mockDb, mockLogger)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        singleCode
      ])
    })

    test('should handle many land cover codes', async () => {
      const manyCodes = Array.from({ length: 100 }, (_, i) => `${100 + i}`)

      await getLandCoverDefinitions(manyCodes, mockDb, mockLogger)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        manyCodes
      ])
    })

    test('should log info when no land cover codes are found', async () => {
      mockResult.rows = []

      const result = await getLandCoverDefinitions(
        testLandCoverCodes,
        mockDb,
        mockLogger
      )

      expect(result).toEqual([])
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          event: {
            category: 'database',
            action: 'Get land cover definitions',
            type: 'info'
          }
        },
        `No land cover codes found [landCoverCodes=${testLandCoverCodes.join(',')}]`
      )
    })

    test('should return empty array when no rows match the query', async () => {
      mockResult.rows = []

      const result = await getLandCoverDefinitions(
        testLandCoverCodes,
        mockDb,
        mockLogger
      )

      expect(result).toEqual([])
      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should handle query result with single row', async () => {
      mockResult.rows = [mockResult.rows[0]]

      const result = await getLandCoverDefinitions(
        testLandCoverCodes,
        mockDb,
        mockLogger
      )

      expect(result).toHaveLength(1)
      expect(result[0].landCoverCode).toBe('111')
    })

    test('should transform land cover codes with class codes', async () => {
      const codesWithClasses = ['110', '120']

      const result = await getLandCoverDefinitions(
        codesWithClasses,
        mockDb,
        mockLogger
      )

      result.forEach((definition) => {
        expect(definition).toHaveProperty('landCoverCode')
        expect(definition).toHaveProperty('landCoverClassCode')
        expect(definition).toHaveProperty('landCoverTypeCode')
        expect(definition).toHaveProperty('landCoverTypeDescription')
        expect(definition).toHaveProperty('landCoverClassDescription')
        expect(definition).toHaveProperty('landCoverDescription')
      })
    })

    test('should handle null database result', async () => {
      mockClient.query.mockResolvedValue(null)

      const result = await getLandCoverDefinitions(
        testLandCoverCodes,
        mockDb,
        mockLogger
      )

      expect(result).toEqual([])
    })

    test('should handle undefined rows in database result', async () => {
      mockClient.query.mockResolvedValue({ rows: undefined })

      // When rows is undefined, the code checks `dbResponse?.rows?.length === 0`
      // which evaluates to false (undefined !== 0), but the transformation
      // function will fail when it tries to iterate over undefined
      await expect(
        getLandCoverDefinitions(testLandCoverCodes, mockDb, mockLogger)
      ).rejects.toThrow('rows is not iterable')
    })
  })

  describe('error handling', () => {
    test('should handle database connection error', async () => {
      const connectionError = new Error('Database connection failed')
      mockDb.connect.mockRejectedValue(connectionError)

      await expect(
        getLandCoverDefinitions(testLandCoverCodes, mockDb, mockLogger)
      ).rejects.toThrow('Database connection failed')

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Database connection failed',
            stack_trace: expect.any(String),
            type: 'Error'
          }),
          event: expect.objectContaining({
            category: 'database',
            action: 'Get land cover definitions',
            type: 'error'
          })
        }),
        'Database operation failed: Get land cover definitions'
      )
      expect(mockClient.release).not.toHaveBeenCalled()
    })

    test('should handle query execution error', async () => {
      const queryError = new Error('SELECT failed')
      mockClient.query.mockRejectedValue(queryError)

      await expect(
        getLandCoverDefinitions(testLandCoverCodes, mockDb, mockLogger)
      ).rejects.toThrow('SELECT failed')

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'SELECT failed'
          })
        }),
        'Database operation failed: Get land cover definitions'
      )
      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should handle database timeout error', async () => {
      const timeoutError = new Error('Query timeout')
      mockClient.query.mockRejectedValue(timeoutError)

      await expect(
        getLandCoverDefinitions(testLandCoverCodes, mockDb, mockLogger)
      ).rejects.toThrow('Query timeout')

      expect(mockLogger.error).toHaveBeenCalled()
    })

    test('should release client even when query fails', async () => {
      const queryError = new Error('Query execution failed')
      mockClient.query.mockRejectedValue(queryError)

      await expect(
        getLandCoverDefinitions(testLandCoverCodes, mockDb, mockLogger)
      ).rejects.toThrow()

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should handle table not found error', async () => {
      const tableError = new Error('relation "land_cover_codes" does not exist')
      mockClient.query.mockRejectedValue(tableError)

      await expect(
        getLandCoverDefinitions(testLandCoverCodes, mockDb, mockLogger)
      ).rejects.toThrow('relation "land_cover_codes" does not exist')

      expect(mockLogger.error).toHaveBeenCalled()
    })

    test('should handle invalid column name error', async () => {
      const columnError = new Error('column "invalid_column" does not exist')
      mockClient.query.mockRejectedValue(columnError)

      await expect(
        getLandCoverDefinitions(testLandCoverCodes, mockDb, mockLogger)
      ).rejects.toThrow()

      expect(mockLogger.error).toHaveBeenCalled()
    })

    test('should handle network errors', async () => {
      const networkError = new Error('ECONNREFUSED')
      mockDb.connect.mockRejectedValue(networkError)

      await expect(
        getLandCoverDefinitions(testLandCoverCodes, mockDb, mockLogger)
      ).rejects.toThrow()

      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('parameter validation', () => {
    test('should return empty array when land cover codes is not an array', async () => {
      const result = await getLandCoverDefinitions(
        'not-an-array',
        mockDb,
        mockLogger
      )

      expect(result).toEqual([])
      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          event: {
            category: 'validation',
            action: 'Fetch land cover definitions',
            type: 'warn',
            reason: 'No land cover codes provided'
          }
        },
        'Validation failed: Fetch land cover definitions'
      )
      expect(mockDb.connect).not.toHaveBeenCalled()
    })

    test('should return empty array when land cover codes is empty array', async () => {
      const result = await getLandCoverDefinitions([], mockDb, mockLogger)

      expect(result).toEqual([])
      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          event: {
            category: 'validation',
            action: 'Fetch land cover definitions',
            type: 'warn',
            reason: 'No land cover codes provided'
          }
        },
        'Validation failed: Fetch land cover definitions'
      )
      expect(mockDb.connect).not.toHaveBeenCalled()
    })

    test('should return empty array when land cover codes is null', async () => {
      const result = await getLandCoverDefinitions(null, mockDb, mockLogger)

      expect(result).toEqual([])
      expect(mockLogger.warn).toHaveBeenCalled()
      expect(mockDb.connect).not.toHaveBeenCalled()
    })

    test('should return empty array when land cover codes is undefined', async () => {
      const result = await getLandCoverDefinitions(
        undefined,
        mockDb,
        mockLogger
      )

      expect(result).toEqual([])
      expect(mockLogger.warn).toHaveBeenCalled()
      expect(mockDb.connect).not.toHaveBeenCalled()
    })

    test('should handle land cover codes with special characters', async () => {
      const specialCodes = ['110-A', '120_B', '130.C']

      await getLandCoverDefinitions(specialCodes, mockDb, mockLogger)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        specialCodes
      ])
    })

    test('should handle mixed numeric and alphanumeric codes', async () => {
      const mixedCodes = ['110', 'AC', '120', 'PG']

      await getLandCoverDefinitions(mixedCodes, mockDb, mockLogger)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        mixedCodes
      ])
    })

    test('should handle duplicate land cover codes in input array', async () => {
      const duplicateCodes = ['110', '110', '120', '120']

      await getLandCoverDefinitions(duplicateCodes, mockDb, mockLogger)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        duplicateCodes
      ])
    })
  })

  describe('transformation', () => {
    test('should correctly transform database rows to camelCase', async () => {
      const result = await getLandCoverDefinitions(
        testLandCoverCodes,
        mockDb,
        mockLogger
      )

      expect(result[0]).toHaveProperty('landCoverCode')
      expect(result[0]).toHaveProperty('landCoverClassCode')
      expect(result[0]).toHaveProperty('landCoverTypeCode')
      expect(result[0]).toHaveProperty('landCoverTypeDescription')
      expect(result[0]).toHaveProperty('landCoverClassDescription')
      expect(result[0]).toHaveProperty('landCoverDescription')

      // Should not have snake_case properties
      expect(result[0]).not.toHaveProperty('land_cover_code')
      expect(result[0]).not.toHaveProperty('land_cover_class_code')
    })

    test('should not include land_use fields in transformed result', async () => {
      const result = await getLandCoverDefinitions(
        testLandCoverCodes,
        mockDb,
        mockLogger
      )

      expect(result[0]).not.toHaveProperty('landUseCode')
      expect(result[0]).not.toHaveProperty('landUseDescription')
      expect(result[0]).not.toHaveProperty('land_use_code')
      expect(result[0]).not.toHaveProperty('land_use_description')
    })

    test('should handle null values in database rows', async () => {
      mockResult.rows = [
        {
          land_cover_type_code: null,
          land_cover_type_description: null,
          land_cover_class_code: '110',
          land_cover_class_description: 'Cereals',
          land_cover_code: '111',
          land_cover_description: null,
          land_use_code: null,
          land_use_description: null
        }
      ]

      const result = await getLandCoverDefinitions(
        testLandCoverCodes,
        mockDb,
        mockLogger
      )

      expect(result[0]).toEqual({
        landCoverCode: '111',
        landCoverClassCode: '110',
        landCoverTypeCode: null,
        landCoverTypeDescription: null,
        landCoverClassDescription: 'Cereals',
        landCoverDescription: null
      })
    })

    test('should transform multiple rows correctly', async () => {
      const result = await getLandCoverDefinitions(
        testLandCoverCodes,
        mockDb,
        mockLogger
      )

      expect(result).toHaveLength(3)
      result.forEach((definition) => {
        expect(typeof definition.landCoverCode).toBe('string')
        expect(typeof definition.landCoverClassCode).toBe('string')
      })
    })
  })

  describe('client release', () => {
    test('should release client in finally block even when query succeeds', async () => {
      await getLandCoverDefinitions(testLandCoverCodes, mockDb, mockLogger)

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should release client in finally block even when query fails', async () => {
      mockClient.query.mockRejectedValue(new Error('Test error'))

      await expect(
        getLandCoverDefinitions(testLandCoverCodes, mockDb, mockLogger)
      ).rejects.toThrow()

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should not call release when client connection fails', async () => {
      mockDb.connect.mockRejectedValue(new Error('Connection failed'))

      await expect(
        getLandCoverDefinitions(testLandCoverCodes, mockDb, mockLogger)
      ).rejects.toThrow()

      expect(mockClient.release).not.toHaveBeenCalled()
    })

    test('should not throw error if client is undefined during release', async () => {
      mockDb.connect.mockResolvedValue(undefined)
      mockClient.query.mockRejectedValue(new Error('Client undefined'))

      await expect(
        getLandCoverDefinitions(testLandCoverCodes, mockDb, mockLogger)
      ).rejects.toThrow()
    })

    test('should handle multiple concurrent calls independently', async () => {
      const codes1 = ['110']
      const codes2 = ['120']

      await Promise.all([
        getLandCoverDefinitions(codes1, mockDb, mockLogger),
        getLandCoverDefinitions(codes2, mockDb, mockLogger)
      ])

      expect(mockDb.connect).toHaveBeenCalledTimes(2)
      expect(mockClient.release).toHaveBeenCalledTimes(2)
    })
  })

  describe('logging', () => {
    test('should not log errors on successful operation with results', async () => {
      await getLandCoverDefinitions(testLandCoverCodes, mockDb, mockLogger)

      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    test('should log info when no results found', async () => {
      mockResult.rows = []

      await getLandCoverDefinitions(testLandCoverCodes, mockDb, mockLogger)

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            category: 'database',
            type: 'info'
          })
        }),
        expect.any(String)
      )
    })

    test('should log validation warning when no codes provided', async () => {
      await getLandCoverDefinitions([], mockDb, mockLogger)

      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          event: {
            category: 'validation',
            action: 'Fetch land cover definitions',
            type: 'warn',
            reason: 'No land cover codes provided'
          }
        },
        'Validation failed: Fetch land cover definitions'
      )
    })

    test('should log database errors with correct structure', async () => {
      const error = new Error('Test error')
      mockClient.query.mockRejectedValue(error)

      await expect(
        getLandCoverDefinitions(testLandCoverCodes, mockDb, mockLogger)
      ).rejects.toThrow()

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Test error',
            stack_trace: expect.any(String),
            type: 'Error'
          }),
          event: expect.objectContaining({
            category: 'database',
            action: 'Get land cover definitions',
            type: 'error'
          })
        }),
        'Database operation failed: Get land cover definitions'
      )
    })
  })
})
