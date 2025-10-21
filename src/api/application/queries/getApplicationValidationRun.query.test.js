import { getApplicationValidationRun } from './getApplicationValidationRun.query.js'

describe('getApplicationValidationRun', () => {
  let mockDb
  let mockLogger
  let mockClient
  let mockResult
  let testId

  beforeEach(() => {
    testId = 'test-id-123'

    // Mock database result
    mockResult = {
      rows: [
        {
          id: 'test-id-123',
          application_id: 'app-456',
          sbi: 'SBI001',
          crn: 'CRN001',
          data: {
            parcels: ['parcel1', 'parcel2'],
            actions: ['action1'],
            totalArea: 150.5
          },
          created_at: '2024-01-01T10:00:00Z'
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

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('successful operation', () => {
    test('should connect to the database', async () => {
      await getApplicationValidationRun(mockLogger, mockDb, testId)

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
    })

    test('should execute SELECT query with correct SQL and parameters', async () => {
      await getApplicationValidationRun(mockLogger, mockDb, testId)

      const expectedQuery = `
      SELECT * FROM application_results WHERE id = $1 ORDER BY created_at DESC LIMIT 1
    `

      expect(mockClient.query).toHaveBeenCalledWith(expectedQuery, [testId])
    })

    test('should return the first row from the query result', async () => {
      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        testId
      )

      expect(result).toEqual(mockResult.rows[0])
      expect(result.id).toBe('test-id-123')
      expect(result.application_id).toBe('app-456')
    })

    test('should log info message when fetching', async () => {
      await getApplicationValidationRun(mockLogger, mockDb, testId)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Connecting to DB to fetch latest application validation run by id'
      )
    })

    test('should release the client after successful operation', async () => {
      await getApplicationValidationRun(mockLogger, mockDb, testId)

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should handle different IDs', async () => {
      const differentId = 'different-id-999'
      mockResult.rows[0].id = differentId

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        differentId
      )

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        differentId
      ])
      expect(result.id).toBe(differentId)
    })

    test('should handle numeric ID', async () => {
      const numericId = 12345
      mockResult.rows[0].id = numericId

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        numericId
      )

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        numericId
      ])
      expect(result.id).toBe(numericId)
    })

    test('should return validation run with complete data structure', async () => {
      const complexData = {
        parcels: [
          { id: 'P1', area: 50.5, type: 'arable' },
          { id: 'P2', area: 100.2, type: 'grassland' }
        ],
        actions: [
          { code: 'A1', parcels: ['P1'], payment: 500 },
          { code: 'A2', parcels: ['P2'], payment: 750 }
        ],
        eligibilityChecks: {
          moorland: { passed: true, percentage: 25 },
          sssi: { passed: false, reason: 'SSSI conflict' }
        },
        totalArea: 150.7,
        totalPayment: 1250.0
      }

      mockResult.rows[0].data = complexData

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        testId
      )

      expect(result.data).toEqual(complexData)
    })

    test('should return undefined when no rows match the query', async () => {
      mockResult.rows = []

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        'non-existent-id'
      )

      expect(result).toBeUndefined()
      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should handle UUID format IDs', async () => {
      const uuidId = '123e4567-e89b-12d3-a456-426614174000'
      mockResult.rows[0].id = uuidId

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        uuidId
      )

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        uuidId
      ])
      expect(result.id).toBe(uuidId)
    })

    test('should return the most recent record based on created_at DESC ordering', async () => {
      // The query includes ORDER BY created_at DESC LIMIT 1
      const mostRecentResult = {
        id: 'test-id-123',
        application_id: 'app-456',
        created_at: '2024-12-31T23:59:59Z'
      }

      mockResult.rows[0] = mostRecentResult

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        testId
      )

      expect(result.created_at).toBe('2024-12-31T23:59:59Z')
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC LIMIT 1'),
        [testId]
      )
    })
  })

  describe('error handling', () => {
    test('should handle database connection error', async () => {
      const connectionError = new Error('Database connection failed')
      mockDb.connect.mockRejectedValue(connectionError)

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        testId
      )

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Database connection failed'
          })
        }),
        expect.stringContaining(
          'Database operation failed: Get application validation run'
        )
      )
      expect(mockClient.release).not.toHaveBeenCalled()
    })

    test('should handle query execution error', async () => {
      const queryError = new Error('SELECT failed')
      mockClient.query.mockRejectedValue(queryError)

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        testId
      )

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'SELECT failed'
          })
        }),
        expect.stringContaining(
          'Database operation failed: Get application validation run'
        )
      )
      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should handle database timeout error', async () => {
      const timeoutError = new Error('Query timeout')
      mockClient.query.mockRejectedValue(timeoutError)

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        testId
      )

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Query timeout'
          })
        }),
        expect.any(String)
      )
    })

    test('should release client even when query fails', async () => {
      const queryError = new Error('Query execution failed')
      mockClient.query.mockRejectedValue(queryError)

      await getApplicationValidationRun(mockLogger, mockDb, testId)

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should handle case when client is null', async () => {
      mockDb.connect.mockResolvedValue(null)

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        testId
      )

      expect(result).toBeNull()
      expect(mockClient.release).not.toHaveBeenCalled()
    })

    test('should handle undefined client', async () => {
      mockDb.connect.mockResolvedValue(undefined)

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        testId
      )

      expect(result).toBeNull()
    })

    test('should handle table not found error', async () => {
      const tableError = new Error(
        'relation "application_results" does not exist'
      )
      mockClient.query.mockRejectedValue(tableError)

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        testId
      )

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'relation "application_results" does not exist'
          })
        }),
        expect.any(String)
      )
    })

    test('should handle invalid column name error', async () => {
      const columnError = new Error('column "invalid_column" does not exist')
      mockClient.query.mockRejectedValue(columnError)

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        testId
      )

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('parameter validation', () => {
    test('should handle null ID parameter', async () => {
      await getApplicationValidationRun(mockLogger, mockDb, null)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [null])
      // If no matching row, result.rows[0] would be undefined
    })

    test('should handle undefined ID parameter', async () => {
      await getApplicationValidationRun(mockLogger, mockDb, undefined)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        undefined
      ])
    })

    test('should handle empty string ID', async () => {
      const emptyId = ''
      mockResult.rows = []

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        emptyId
      )

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [''])
      expect(result).toBeUndefined()
    })

    test('should handle ID with special characters', async () => {
      const specialId = 'test-id_123@#$'
      mockResult.rows[0].id = specialId

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        specialId
      )

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        specialId
      ])
      expect(result.id).toBe(specialId)
    })

    test('should handle very long ID string', async () => {
      const longId = 'x'.repeat(1000)
      mockResult.rows[0].id = longId

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        longId
      )

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        longId
      ])
      expect(result.id).toBe(longId)
    })
  })

  describe('logging', () => {
    test('should not log errors on successful operation', async () => {
      await getApplicationValidationRun(mockLogger, mockDb, testId)

      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    test('should log info message before connecting to database', async () => {
      await getApplicationValidationRun(mockLogger, mockDb, testId)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Connecting to DB to fetch latest application validation run by id'
      )
      expect(mockDb.connect).toHaveBeenCalledTimes(1)
    })

    test('should log database errors with correct structure', async () => {
      const error = new Error('Test error')
      mockClient.query.mockRejectedValue(error)

      await getApplicationValidationRun(mockLogger, mockDb, testId)

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Test error',
            stack_trace: expect.any(String),
            type: 'Error'
          }),
          event: expect.objectContaining({
            category: 'database',
            action: 'Get application validation run',
            type: 'error'
          })
        }),
        expect.stringContaining(
          'Database operation failed: Get application validation run'
        )
      )
    })

    test('should log different error types correctly', async () => {
      const typeError = new TypeError('Type error occurred')
      mockClient.query.mockRejectedValue(typeError)

      await getApplicationValidationRun(mockLogger, mockDb, testId)

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Type error occurred',
            type: 'TypeError'
          })
        }),
        expect.any(String)
      )
    })
  })

  describe('client release', () => {
    test('should release client in finally block even when query succeeds', async () => {
      await getApplicationValidationRun(mockLogger, mockDb, testId)

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should release client in finally block even when query fails', async () => {
      mockClient.query.mockRejectedValue(new Error('Test error'))

      await getApplicationValidationRun(mockLogger, mockDb, testId)

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should not call release when client connection fails', async () => {
      mockDb.connect.mockRejectedValue(new Error('Connection failed'))

      await getApplicationValidationRun(mockLogger, mockDb, testId)

      expect(mockClient.release).not.toHaveBeenCalled()
    })

    test('should not throw error if client is undefined during release', async () => {
      mockDb.connect.mockResolvedValue(undefined)

      await expect(
        getApplicationValidationRun(mockLogger, mockDb, testId)
      ).resolves.not.toThrow()
    })

    test('should handle multiple concurrent calls independently', async () => {
      const id1 = 'id-1'
      const id2 = 'id-2'

      await Promise.all([
        getApplicationValidationRun(mockLogger, mockDb, id1),
        getApplicationValidationRun(mockLogger, mockDb, id2)
      ])

      expect(mockDb.connect).toHaveBeenCalledTimes(2)
      expect(mockClient.release).toHaveBeenCalledTimes(2)
    })
  })

  describe('return value', () => {
    test('should return first row when rows exist', async () => {
      const expectedRow = mockResult.rows[0]

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        testId
      )

      expect(result).toEqual(expectedRow)
    })

    test('should return undefined when no rows exist', async () => {
      mockResult.rows = []

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        testId
      )

      expect(result).toBeUndefined()
    })

    test('should return null on error', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'))

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        testId
      )

      expect(result).toBeNull()
    })

    test('should return complete row with all fields', async () => {
      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        testId
      )

      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('application_id')
      expect(result).toHaveProperty('sbi')
      expect(result).toHaveProperty('crn')
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('created_at')
    })

    test('should return row with null fields if they exist in database', async () => {
      mockResult.rows[0] = {
        id: 'test-id',
        application_id: null,
        sbi: null,
        crn: null,
        data: null,
        created_at: '2024-01-01T00:00:00Z'
      }

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        testId
      )

      expect(result.application_id).toBeNull()
      expect(result.sbi).toBeNull()
      expect(result.crn).toBeNull()
      expect(result.data).toBeNull()
    })
  })
})
