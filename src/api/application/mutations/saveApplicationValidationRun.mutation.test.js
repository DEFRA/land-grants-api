import { saveApplicationValidationRun } from './saveApplicationValidationRun.mutation.js'

describe('saveApplicationValidationRun', () => {
  let mockDb
  let mockLogger
  let mockClient
  let mockResult
  let testApplicationValidationRun

  beforeEach(() => {
    testApplicationValidationRun = {
      application_id: 'app-123',
      sbi: 'SBI001',
      crn: 'CRN001',
      data: {
        validationResults: {
          passed: true,
          checks: ['check1', 'check2']
        }
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
            validationResults: {
              passed: true,
              checks: ['check1', 'check2']
            }
          },
          created_at: '2024-01-01T10:00:00Z'
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
      await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        testApplicationValidationRun
      )

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
    })

    test('should execute INSERT query with correct SQL and parameters', async () => {
      await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        testApplicationValidationRun
      )

      const expectedQuery = `
      INSERT INTO application_results (application_id, sbi, crn, data)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `

      expect(mockClient.query).toHaveBeenCalledWith(expectedQuery, [
        'app-123',
        'SBI001',
        'CRN001',
        testApplicationValidationRun.data
      ])
    })

    test('should return the saved application validation run', async () => {
      const result = await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        testApplicationValidationRun
      )

      expect(result).toEqual(mockResult.rows[0])
    })

    test('should log success message', async () => {
      await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        testApplicationValidationRun
      )

      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          event: {
            category: 'database',
            action: undefined,
            type: 'info'
          }
        },
        'Save application validation run'
      )
    })

    test('should release the client after successful operation', async () => {
      await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        testApplicationValidationRun
      )

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should handle different application IDs', async () => {
      const differentApp = {
        application_id: 'app-999',
        sbi: 'SBI999',
        crn: 'CRN999',
        data: { test: 'data' }
      }

      await saveApplicationValidationRun(mockLogger, mockDb, differentApp)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        'app-999',
        'SBI999',
        'CRN999',
        { test: 'data' }
      ])
    })

    test('should handle complex data objects', async () => {
      const complexData = {
        validationResults: {
          passed: false,
          checks: ['check1', 'check2', 'check3'],
          errors: [
            { field: 'field1', message: 'Error 1' },
            { field: 'field2', message: 'Error 2' }
          ],
          warnings: ['warning1', 'warning2'],
          metadata: {
            timestamp: '2024-01-01T00:00:00Z',
            validator: 'v1.0'
          }
        }
      }

      const complexApp = {
        application_id: 'app-complex',
        sbi: 'SBI002',
        crn: 'CRN002',
        data: complexData
      }

      mockResult.rows[0].data = complexData

      const result = await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        complexApp
      )

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        'app-complex',
        'SBI002',
        'CRN002',
        complexData
      ])
      expect(result.data).toEqual(complexData)
    })
  })

  describe('error handling', () => {
    test('should handle database connection error', async () => {
      const connectionError = new Error('Database connection failed')
      mockDb.connect.mockRejectedValue(connectionError)

      const result = await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        testApplicationValidationRun
      )

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

      const result = await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        testApplicationValidationRun
      )

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

      const result = await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        testApplicationValidationRun
      )

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

      await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        testApplicationValidationRun
      )

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should handle case when client is null', async () => {
      mockDb.connect.mockResolvedValue(null)

      const result = await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        testApplicationValidationRun
      )

      expect(result).toBeNull()
      expect(mockClient.release).not.toHaveBeenCalled()
    })

    test('should handle undefined client', async () => {
      mockDb.connect.mockResolvedValue(undefined)

      const result = await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        testApplicationValidationRun
      )

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

      const result = await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        appWithCircular
      )

      expect(result).toBeNull()
      expect(mockLogger.error).toHaveBeenCalled()
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

      const result = await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        appWithNullData
      )

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        'app-null',
        'SBI004',
        'CRN004',
        null
      ])
      expect(result.data).toBeNull()
    })

    test('should handle empty data object', async () => {
      const appWithEmptyData = {
        application_id: 'app-empty',
        sbi: 'SBI005',
        crn: 'CRN005',
        data: {}
      }

      mockResult.rows[0].data = {}

      const result = await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        appWithEmptyData
      )

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        'app-empty',
        'SBI005',
        'CRN005',
        {}
      ])
      expect(result.data).toEqual({})
    })

    test('should handle null/undefined sbi and crn', async () => {
      const appWithNullFields = {
        application_id: 'app-nullable',
        sbi: null,
        crn: undefined,
        data: { test: 'data' }
      }

      await saveApplicationValidationRun(mockLogger, mockDb, appWithNullFields)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        'app-nullable',
        null,
        undefined,
        { test: 'data' }
      ])
    })
  })

  describe('logging', () => {
    test('should not log errors on successful operation', async () => {
      await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        testApplicationValidationRun
      )

      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    test('should log database errors with correct structure', async () => {
      const error = new Error('Test error')
      mockClient.query.mockRejectedValue(error)

      await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        testApplicationValidationRun
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
            action: 'Save application validation run',
            type: 'error'
          })
        }),
        expect.stringContaining(
          'Database operation failed: Save application validation run'
        )
      )
    })
  })

  describe('client release', () => {
    test('should release client in finally block even when query succeeds', async () => {
      await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        testApplicationValidationRun
      )

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should release client in finally block even when query fails', async () => {
      mockClient.query.mockRejectedValue(new Error('Test error'))

      await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        testApplicationValidationRun
      )

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    test('should not call release when client connection fails', async () => {
      mockDb.connect.mockRejectedValue(new Error('Connection failed'))

      await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        testApplicationValidationRun
      )

      expect(mockClient.release).not.toHaveBeenCalled()
    })

    test('should not throw error if client is undefined during release', async () => {
      mockDb.connect.mockResolvedValue(undefined)

      await expect(
        saveApplicationValidationRun(
          mockLogger,
          mockDb,
          testApplicationValidationRun
        )
      ).resolves.not.toThrow()
    })
  })
})
