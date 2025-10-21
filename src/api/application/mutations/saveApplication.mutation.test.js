import { saveApplication } from './saveApplication.mutation.js'

describe('saveApplication', () => {
  let mockDb
  let mockLogger
  let mockClient
  let mockResult
  let testApplication

  beforeEach(() => {
    testApplication = {
      application_id: 'app-123',
      sbi: 'SBI001',
      crn: 'CRN001',
      data: {
        parcels: ['parcel1', 'parcel2'],
        actions: ['action1', 'action2'],
        totalArea: 100.5
      }
    }

    // Mock database result
    mockResult = {
      rows: [
        {
          id: 1,
          application_id: 'app-123',
          sbi: 'SBI001',
          crn: 'CRN001',
          data: {
            parcels: ['parcel1', 'parcel2'],
            actions: ['action1', 'action2'],
            totalArea: 100.5
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
      await saveApplication(mockLogger, mockDb, testApplication)

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
    })

    test('should execute INSERT query with correct SQL and parameters', async () => {
      await saveApplication(mockLogger, mockDb, testApplication)

      const expectedQuery = `
      INSERT INTO application_results (application_id, sbi, crn, data)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `

      expect(mockClient.query).toHaveBeenCalledWith(expectedQuery, [
        'app-123',
        'SBI001',
        'CRN001',
        testApplication.data
      ])
    })

    test('should return the ID of the saved application', async () => {
      const result = await saveApplication(mockLogger, mockDb, testApplication)

      expect(result).toBe(1)
    })

    test('should log info message with correct context', async () => {
      await saveApplication(mockLogger, mockDb, testApplication)

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          event: {
            category: 'application',
            action: undefined,
            type: 'info'
          }
        },
        'Saving application [applicationId=app-123 | sbi=SBI001 | crn=CRN001]'
      )
    })

    test('should release the client after successful operation', async () => {
      await saveApplication(mockLogger, mockDb, testApplication)

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should handle different application IDs', async () => {
      const differentApp = {
        application_id: 'app-999',
        sbi: 'SBI999',
        crn: 'CRN999',
        data: { test: 'data' }
      }

      mockResult.rows[0].id = 999

      const result = await saveApplication(mockLogger, mockDb, differentApp)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        'app-999',
        'SBI999',
        'CRN999',
        { test: 'data' }
      ])
      expect(result).toBe(999)
    })

    test('should handle complex data objects', async () => {
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
        totalPayment: 1250.0,
        metadata: {
          submittedAt: '2024-01-01T00:00:00Z',
          version: '1.0'
        }
      }

      const complexApp = {
        application_id: 'app-complex',
        sbi: 'SBI002',
        crn: 'CRN002',
        data: complexData
      }

      mockResult.rows[0].id = 42
      mockResult.rows[0].data = complexData

      const result = await saveApplication(mockLogger, mockDb, complexApp)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        'app-complex',
        'SBI002',
        'CRN002',
        complexData
      ])
      expect(result).toBe(42)
    })

    test('should handle numeric ID correctly', async () => {
      mockResult.rows[0].id = 12345

      const result = await saveApplication(mockLogger, mockDb, testApplication)

      expect(result).toBe(12345)
      expect(typeof result).toBe('number')
    })
  })

  describe('error handling', () => {
    test('should handle database connection error', async () => {
      const connectionError = new Error('Database connection failed')
      mockDb.connect.mockRejectedValue(connectionError)

      const result = await saveApplication(mockLogger, mockDb, testApplication)

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Database connection failed'
          })
        }),
        expect.stringContaining(
          'Database operation failed: Save application validation run'
        )
      )
      expect(mockClient.release).not.toHaveBeenCalled()
    })

    test('should handle query execution error', async () => {
      const queryError = new Error('INSERT failed')
      mockClient.query.mockRejectedValue(queryError)

      const result = await saveApplication(mockLogger, mockDb, testApplication)

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'INSERT failed'
          })
        }),
        expect.stringContaining(
          'Database operation failed: Save application validation run'
        )
      )
      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should handle constraint violation error', async () => {
      const constraintError = new Error(
        'duplicate key value violates unique constraint'
      )
      mockClient.query.mockRejectedValue(constraintError)

      const result = await saveApplication(mockLogger, mockDb, testApplication)

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'duplicate key value violates unique constraint'
          })
        }),
        expect.any(String)
      )
    })

    test('should release client even when query fails', async () => {
      const queryError = new Error('Query execution failed')
      mockClient.query.mockRejectedValue(queryError)

      await saveApplication(mockLogger, mockDb, testApplication)

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should handle case when client is null', async () => {
      mockDb.connect.mockResolvedValue(null)

      const result = await saveApplication(mockLogger, mockDb, testApplication)

      expect(result).toBeNull()
      expect(mockClient.release).not.toHaveBeenCalled()
    })

    test('should handle undefined client', async () => {
      mockDb.connect.mockResolvedValue(undefined)

      const result = await saveApplication(mockLogger, mockDb, testApplication)

      expect(result).toBeNull()
    })

    test('should handle JSON serialization error for complex data', async () => {
      // Create circular reference that can't be serialized
      const circularData = { a: 'test' }
      circularData.self = circularData

      const appWithCircular = {
        application_id: 'app-circular',
        sbi: 'SBI003',
        crn: 'CRN003',
        data: circularData
      }

      // Query will fail when trying to serialize circular structure
      const serializationError = new Error(
        'Converting circular structure to JSON'
      )
      mockClient.query.mockRejectedValue(serializationError)

      const result = await saveApplication(mockLogger, mockDb, appWithCircular)

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalled()
    })

    test('should handle empty result rows', async () => {
      mockResult.rows = []

      // When rows is empty, accessing rows[0].id will cause a runtime error
      // The function will catch this and return null
      const result = await saveApplication(mockLogger, mockDb, testApplication)

      expect(result).toBeNull()
      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })
  })

  describe('parameter validation', () => {
    test('should handle null data field', async () => {
      const appWithNullData = {
        application_id: 'app-null',
        sbi: 'SBI004',
        crn: 'CRN004',
        data: null
      }

      mockResult.rows[0].data = null
      mockResult.rows[0].id = 5

      const result = await saveApplication(mockLogger, mockDb, appWithNullData)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        'app-null',
        'SBI004',
        'CRN004',
        null
      ])
      expect(result).toBe(5)
    })

    test('should handle empty data object', async () => {
      const appWithEmptyData = {
        application_id: 'app-empty',
        sbi: 'SBI005',
        crn: 'CRN005',
        data: {}
      }

      mockResult.rows[0].data = {}
      mockResult.rows[0].id = 6

      const result = await saveApplication(mockLogger, mockDb, appWithEmptyData)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        'app-empty',
        'SBI005',
        'CRN005',
        {}
      ])
      expect(result).toBe(6)
    })

    test('should handle null/undefined sbi and crn', async () => {
      const appWithNullFields = {
        application_id: 'app-nullable',
        sbi: null,
        crn: undefined,
        data: { test: 'data' }
      }

      mockResult.rows[0].id = 7

      const result = await saveApplication(
        mockLogger,
        mockDb,
        appWithNullFields
      )

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        'app-nullable',
        null,
        undefined,
        { test: 'data' }
      ])
      expect(result).toBe(7)
    })

    test('should handle application with string ID', async () => {
      mockResult.rows[0].id = 'uuid-string-id'

      const result = await saveApplication(mockLogger, mockDb, testApplication)

      expect(result).toBe('uuid-string-id')
    })
  })

  describe('logging', () => {
    test('should not log errors on successful operation', async () => {
      await saveApplication(mockLogger, mockDb, testApplication)

      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    test('should log info message with application context', async () => {
      await saveApplication(mockLogger, mockDb, testApplication)

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({
            category: 'application',
            type: 'info'
          })
        }),
        'Saving application [applicationId=app-123 | sbi=SBI001 | crn=CRN001]'
      )
    })

    test('should log database errors with correct structure', async () => {
      const error = new Error('Test error')
      mockClient.query.mockRejectedValue(error)

      await saveApplication(mockLogger, mockDb, testApplication)

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Test error',
            stack_trace: expect.any(String),
            type: 'Error'
          }),
          event: expect.objectContaining({
            category: 'database',
            action: 'Save application validation run',
            type: 'error'
          })
        }),
        expect.stringContaining(
          'Database operation failed: Save application validation run'
        )
      )
    })

    test('should log different error types correctly', async () => {
      const typeError = new TypeError('Type error occurred')
      mockClient.query.mockRejectedValue(typeError)

      await saveApplication(mockLogger, mockDb, testApplication)

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
      await saveApplication(mockLogger, mockDb, testApplication)

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should release client in finally block even when query fails', async () => {
      mockClient.query.mockRejectedValue(new Error('Test error'))

      await saveApplication(mockLogger, mockDb, testApplication)

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should not call release when client connection fails', async () => {
      mockDb.connect.mockRejectedValue(new Error('Connection failed'))

      await saveApplication(mockLogger, mockDb, testApplication)

      expect(mockClient.release).not.toHaveBeenCalled()
    })

    test('should not throw error if client is undefined during release', async () => {
      mockDb.connect.mockResolvedValue(undefined)

      await expect(
        saveApplication(mockLogger, mockDb, testApplication)
      ).resolves.not.toThrow()
    })

    test('should handle multiple concurrent calls independently', async () => {
      const app1 = { ...testApplication, application_id: 'app-1' }
      const app2 = { ...testApplication, application_id: 'app-2' }

      mockResult.rows[0].id = 100

      await Promise.all([
        saveApplication(mockLogger, mockDb, app1),
        saveApplication(mockLogger, mockDb, app2)
      ])

      expect(mockDb.connect).toHaveBeenCalledTimes(2)
      expect(mockClient.release).toHaveBeenCalledTimes(2)
    })
  })

  describe('return value', () => {
    test('should return integer ID when present', async () => {
      mockResult.rows[0].id = 42

      const result = await saveApplication(mockLogger, mockDb, testApplication)

      expect(result).toBe(42)
      expect(typeof result).toBe('number')
    })

    test('should return string ID when present', async () => {
      mockResult.rows[0].id = 'uuid-123-456'

      const result = await saveApplication(mockLogger, mockDb, testApplication)

      expect(result).toBe('uuid-123-456')
      expect(typeof result).toBe('string')
    })

    test('should return null on error', async () => {
      mockClient.query.mockRejectedValue(new Error('Database error'))

      const result = await saveApplication(mockLogger, mockDb, testApplication)

      expect(result).toBeNull()
    })

    test('should handle zero as valid ID', async () => {
      mockResult.rows[0].id = 0

      const result = await saveApplication(mockLogger, mockDb, testApplication)

      expect(result).toBe(0)
    })
  })
})
