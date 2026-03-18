import { getLatestApplicationRunForAppId } from './getLatestApplicationRunForAppId.query.js'

describe('getLatestApplicationRunForAppId', () => {
  let mockDb
  let mockLogger
  let mockClient
  let mockResult
  let testApplicationId

  beforeEach(() => {
    testApplicationId = 'APP-123'

    mockResult = {
      rows: [
        {
          id: 'run-1',
          application_id: 'app-123',
          sbi: 'SBI001',
          crn: 'CRN001',
          data: {
            parcels: ['parcel1', 'parcel2'],
            actions: ['action1'],
            totalArea: 150.5
          },
          created_at: '2024-01-03T10:00:00Z'
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

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('successful operation', () => {
    test('should connect to the database', async () => {
      await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
    })

    test('should execute SELECT query with correct SQL and parameters', async () => {
      await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        testApplicationId
      )

      const expectedQuery = `
      SELECT * FROM application_results WHERE application_id = $1 ORDER BY created_at DESC LIMIT 1
    `

      expect(mockClient.query).toHaveBeenCalledWith(expectedQuery, [
        testApplicationId.toLowerCase()
      ])
    })

    test('should return the first row from the query result', async () => {
      const result = await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(result).toEqual(mockResult.rows[0])
      expect(result.id).toBe('run-1')
      expect(result.application_id).toBe('app-123')
    })

    test('should convert application ID to lowercase', async () => {
      const upperCaseId = 'APP-UPPERCASE-123'

      await getLatestApplicationRunForAppId(mockLogger, mockDb, upperCaseId)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        'app-uppercase-123'
      ])
    })

    test('should handle mixed case application IDs', async () => {
      const mixedCaseId = 'ApP-MiXeD-456'

      await getLatestApplicationRunForAppId(mockLogger, mockDb, mixedCaseId)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        'app-mixed-456'
      ])
    })

    test('should log info message with correct context', async () => {
      await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        testApplicationId
      )

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

    test('should release the client after successful operation', async () => {
      await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should return null when no rows match the query', async () => {
      mockResult.rows = []

      const result = await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        'non-existent-app'
      )

      expect(result).toBeNull()
      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should return the most recent record based on created_at DESC ordering', async () => {
      const result = await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(result.created_at).toBe('2024-01-03T10:00:00Z')
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC LIMIT 1'),
        [testApplicationId.toLowerCase()]
      )
    })

    test('should handle different application IDs', async () => {
      const differentAppId = 'different-app-999'
      mockResult.rows[0].application_id = differentAppId.toLowerCase()

      const result = await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        differentAppId
      )

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        differentAppId.toLowerCase()
      ])
      expect(result.application_id).toBe(differentAppId.toLowerCase())
    })

    test('should return validation run with complex data structure', async () => {
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

      const result = await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(result.data).toEqual(complexData)
    })

    test('should handle UUID format application IDs', async () => {
      const uuidAppId = '123e4567-e89b-12d3-a456-426614174000'
      mockResult.rows[0].application_id = uuidAppId

      const result = await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        uuidAppId
      )

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        uuidAppId.toLowerCase()
      ])
      expect(result.application_id).toBe(uuidAppId)
    })
  })

  describe('error handling', () => {
    test('should handle database connection error', async () => {
      const connectionError = new Error('Database connection failed')
      mockDb.connect.mockRejectedValue(connectionError)

      const result = await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Database connection failed'
          })
        }),
        expect.stringContaining(
          'Database operation failed: Get latest application run for application id'
        )
      )
      expect(mockClient.release).not.toHaveBeenCalled()
    })

    test('should handle query execution error', async () => {
      const queryError = new Error('SELECT failed')
      mockClient.query.mockRejectedValue(queryError)

      const result = await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'SELECT failed'
          })
        }),
        expect.stringContaining(
          'Database operation failed: Get latest application run for application id'
        )
      )
      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should handle database timeout error', async () => {
      const timeoutError = new Error('Query timeout')
      mockClient.query.mockRejectedValue(timeoutError)

      const result = await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        testApplicationId
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

      await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should handle case when client is null', async () => {
      mockDb.connect.mockResolvedValue(null)

      const result = await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(result).toBeNull()
      expect(mockClient.release).not.toHaveBeenCalled()
    })

    test('should handle undefined client', async () => {
      mockDb.connect.mockResolvedValue(undefined)

      const result = await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(result).toBeNull()
    })

    test('should handle table not found error', async () => {
      const tableError = new Error(
        'relation "application_results" does not exist'
      )
      mockClient.query.mockRejectedValue(tableError)

      const result = await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        testApplicationId
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

    test('should handle network errors', async () => {
      const networkError = new Error('ECONNREFUSED')
      mockDb.connect.mockRejectedValue(networkError)

      const result = await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  describe('parameter validation', () => {
    test('should handle null application ID parameter', async () => {
      await getLatestApplicationRunForAppId(mockLogger, mockDb, null)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        undefined
      ])
    })

    test('should handle undefined application ID parameter', async () => {
      await getLatestApplicationRunForAppId(mockLogger, mockDb, undefined)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        undefined
      ])
    })

    test('should handle empty string application ID', async () => {
      const emptyId = ''
      mockResult.rows = []

      const result = await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        emptyId
      )

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [''])
      expect(result).toBeNull()
    })

    test('should handle application ID with special characters', async () => {
      const specialId = 'APP-ID_123@#$'
      mockResult.rows[0].application_id = specialId.toLowerCase()

      const result = await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        specialId
      )

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        specialId.toLowerCase()
      ])
      expect(result.application_id).toBe(specialId.toLowerCase())
    })

    test('should handle very long application ID string', async () => {
      const longId = 'APP-' + 'X'.repeat(1000)
      mockResult.rows[0].application_id = longId.toLowerCase()

      const result = await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        longId
      )

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        longId.toLowerCase()
      ])
      expect(result.application_id).toBe(longId.toLowerCase())
    })

    test('should handle application ID that is already lowercase', async () => {
      const lowercaseId = 'app-already-lowercase'

      await getLatestApplicationRunForAppId(mockLogger, mockDb, lowercaseId)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        'app-already-lowercase'
      ])
    })
  })

  describe('logging', () => {
    test('should not log errors on successful operation', async () => {
      await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    test('should log info message with application context', async () => {
      await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        testApplicationId
      )

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

    test('should log database errors with correct structure', async () => {
      const error = new Error('Test error')
      mockClient.query.mockRejectedValue(error)

      await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Test error',
            stack_trace: expect.any(String),
            type: 'Error'
          }),
          event: expect.objectContaining({
            category: 'database',
            action: 'Get latest application run for application id',
            type: 'error'
          })
        }),
        expect.stringContaining(
          'Database operation failed: Get latest application run for application id'
        )
      )
    })

    test('should log different error types correctly', async () => {
      const typeError = new TypeError('Type error occurred')
      mockClient.query.mockRejectedValue(typeError)

      await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        testApplicationId
      )

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
      await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should release client in finally block even when query fails', async () => {
      mockClient.query.mockRejectedValue(new Error('Test error'))

      await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should not call release when client connection fails', async () => {
      mockDb.connect.mockRejectedValue(new Error('Connection failed'))

      await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(mockClient.release).not.toHaveBeenCalled()
    })

    test('should not throw error if client is undefined during release', async () => {
      mockDb.connect.mockResolvedValue(undefined)

      await expect(
        getLatestApplicationRunForAppId(mockLogger, mockDb, testApplicationId)
      ).resolves.not.toThrow()
    })

    test('should handle multiple concurrent calls independently', async () => {
      const appId1 = 'app-1'
      const appId2 = 'app-2'

      await Promise.all([
        getLatestApplicationRunForAppId(mockLogger, mockDb, appId1),
        getLatestApplicationRunForAppId(mockLogger, mockDb, appId2)
      ])

      expect(mockDb.connect).toHaveBeenCalledTimes(2)
      expect(mockClient.release).toHaveBeenCalledTimes(2)
    })
  })

  describe('return value', () => {
    test('should return row when rows exist', async () => {
      const expectedRow = mockResult.rows[0]

      const result = await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(result).toEqual(expectedRow)
    })

    test('should return null when no rows exist', async () => {
      mockResult.rows = []

      const result = await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(result).toBeNull()
    })

    test('should return null on error', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'))

      const result = await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(result).toBeNull()
    })

    test('should return complete row with all fields', async () => {
      const result = await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        testApplicationId
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

      const result = await getLatestApplicationRunForAppId(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(result.application_id).toBeNull()
      expect(result.sbi).toBeNull()
      expect(result.crn).toBeNull()
      expect(result.data).toBeNull()
    })
  })
})
