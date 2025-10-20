import { getApplicationValidationRun } from '~/src/api/application/queries/getApplicationValidationRun.query.js'

describe('getApplicationValidationRun', () => {
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

  const testId = 'test-id-123'

  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.connect.mockResolvedValue(mockClient)
  })

  describe('successful data retrieval', () => {
    it('should return application validation run when found', async () => {
      const mockApplicationValidationRun = {
        id: testId,
        application_id: 'app-123',
        sbi: 'sbi-456',
        crn: 'crn-789',
        data: { test: 'data' },
        created_at: new Date('2025-01-01T00:00:00Z')
      }

      mockClient.query.mockResolvedValue({
        rows: [mockApplicationValidationRun]
      })

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        testId
      )

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Connecting to DB to fetch latest application validation run by id'
      )
      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM application_results'),
        [testId]
      )
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [testId]
      )
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC LIMIT 1'),
        [testId]
      )
      expect(mockClient.release).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockApplicationValidationRun)
    })

    it('should return undefined when application validation run not found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        'non-existent-id'
      )

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        'non-existent-id'
      ])
      expect(mockClient.release).toHaveBeenCalledTimes(1)
      expect(result).toBeUndefined()
    })

    it('should return the first row when multiple rows exist', async () => {
      const mockApplicationValidationRuns = [
        {
          id: testId,
          application_id: 'app-123',
          created_at: new Date('2025-01-03T00:00:00Z')
        },
        {
          id: testId,
          application_id: 'app-123',
          created_at: new Date('2025-01-02T00:00:00Z')
        }
      ]

      mockClient.query.mockResolvedValue({
        rows: mockApplicationValidationRuns
      })

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        testId
      )

      expect(result).toEqual(mockApplicationValidationRuns[0])
    })

    it('should handle application validation run with complex data', async () => {
      const mockApplicationValidationRun = {
        id: testId,
        application_id: 'app-123',
        sbi: 'sbi-456',
        crn: 'crn-789',
        data: {
          nested: {
            structure: {
              with: 'values',
              and: ['arrays', 'too']
            }
          },
          validationResults: {
            passed: false,
            errors: [
              { code: 'ERR1', message: 'Error 1' },
              { code: 'ERR2', message: 'Error 2' }
            ]
          }
        },
        created_at: new Date('2025-01-01T00:00:00Z')
      }

      mockClient.query.mockResolvedValue({
        rows: [mockApplicationValidationRun]
      })

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        testId
      )

      expect(result).toEqual(mockApplicationValidationRun)
      expect(result.data).toEqual(mockApplicationValidationRun.data)
    })

    it('should handle application validation run with null data', async () => {
      const mockApplicationValidationRun = {
        id: testId,
        application_id: 'app-123',
        sbi: 'sbi-456',
        crn: 'crn-789',
        data: null,
        created_at: new Date('2025-01-01T00:00:00Z')
      }

      mockClient.query.mockResolvedValue({
        rows: [mockApplicationValidationRun]
      })

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        testId
      )

      expect(result).toEqual(mockApplicationValidationRun)
      expect(result.data).toBeNull()
    })
  })

  describe('error handling', () => {
    it('should handle database connection error and return null', async () => {
      const connectionError = new Error('Database connection failed')
      mockDb.connect.mockRejectedValue(connectionError)

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        testId
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error executing get application validation run by id query: ${connectionError.message}`
      )
      expect(mockClient.release).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })

    it('should handle query execution error and return null', async () => {
      const queryError = new Error('Query execution failed')
      mockClient.query.mockRejectedValue(queryError)

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        testId
      )

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error executing get application validation run by id query: ${queryError.message}`
      )
      expect(mockClient.release).toHaveBeenCalledTimes(1)
      expect(result).toBeNull()
    })

    it('should handle database timeout error and return null', async () => {
      const timeoutError = new Error('Connection timeout')
      mockClient.query.mockRejectedValue(timeoutError)

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        testId
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error executing get application validation run by id query: ${timeoutError.message}`
      )
      expect(result).toBeNull()
    })

    it('should release client even when query fails', async () => {
      const queryError = new Error('Query execution failed')
      mockClient.query.mockRejectedValue(queryError)

      await getApplicationValidationRun(mockLogger, mockDb, testId)

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    it('should not release client when connection fails', async () => {
      const connectionError = new Error('Connection failed')
      mockDb.connect.mockRejectedValue(connectionError)

      await getApplicationValidationRun(mockLogger, mockDb, testId)

      expect(mockClient.release).not.toHaveBeenCalled()
    })

    it('should handle case when client is null', async () => {
      mockDb.connect.mockResolvedValue(null)

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        testId
      )

      expect(mockClient.release).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })

    it('should handle case when result is null', async () => {
      mockClient.query.mockResolvedValue(null)

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        testId
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'Error executing get application validation run by id query:'
        )
      )
      expect(result).toBeNull()
    })
  })

  describe('parameter validation', () => {
    it('should handle numeric id', async () => {
      const numericId = 12345
      const mockApplicationValidationRun = {
        id: numericId,
        application_id: 'app-123',
        sbi: 'sbi-456',
        crn: 'crn-789',
        data: { test: 'data' }
      }

      mockClient.query.mockResolvedValue({
        rows: [mockApplicationValidationRun]
      })

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        numericId
      )

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        numericId
      ])
      expect(result).toEqual(mockApplicationValidationRun)
    })

    it('should handle string id', async () => {
      const stringId = 'string-id-123'
      const mockApplicationValidationRun = {
        id: stringId,
        application_id: 'app-123',
        sbi: 'sbi-456',
        crn: 'crn-789',
        data: { test: 'data' }
      }

      mockClient.query.mockResolvedValue({
        rows: [mockApplicationValidationRun]
      })

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        stringId
      )

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        stringId
      ])
      expect(result).toEqual(mockApplicationValidationRun)
    })

    it('should handle null id', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      const result = await getApplicationValidationRun(mockLogger, mockDb, null)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [null])
      expect(result).toBeUndefined()
    })

    it('should handle undefined id', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        undefined
      )

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        undefined
      ])
      expect(result).toBeUndefined()
    })

    it('should handle empty string id', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      const result = await getApplicationValidationRun(mockLogger, mockDb, '')

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [''])
      expect(result).toBeUndefined()
    })
  })

  describe('logging', () => {
    it('should log info message when connecting to database', async () => {
      mockClient.query.mockResolvedValue({
        rows: [{ id: testId }]
      })

      await getApplicationValidationRun(mockLogger, mockDb, testId)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Connecting to DB to fetch latest application validation run by id'
      )
      expect(mockLogger.info).toHaveBeenCalledTimes(1)
    })

    it('should log error message with correct format on failure', async () => {
      const testError = new Error('Specific test error')
      mockClient.query.mockRejectedValue(testError)

      await getApplicationValidationRun(mockLogger, mockDb, testId)

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error executing get application validation run by id query: Specific test error'
      )
      expect(mockLogger.error).toHaveBeenCalledTimes(1)
    })

    it('should not log error message on successful query', async () => {
      mockClient.query.mockResolvedValue({
        rows: [{ id: testId }]
      })

      await getApplicationValidationRun(mockLogger, mockDb, testId)

      expect(mockLogger.error).not.toHaveBeenCalled()
    })
  })

  describe('database query structure', () => {
    it('should use correct SQL query with ORDER BY and LIMIT', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      await getApplicationValidationRun(mockLogger, mockDb, testId)

      const queryCall = mockClient.query.mock.calls[0]
      const sqlQuery = queryCall[0]

      expect(sqlQuery).toContain('SELECT * FROM application_results')
      expect(sqlQuery).toContain('WHERE id = $1')
      expect(sqlQuery).toContain('ORDER BY created_at DESC')
      expect(sqlQuery).toContain('LIMIT 1')
    })

    it('should pass id parameter correctly', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      await getApplicationValidationRun(mockLogger, mockDb, testId)

      const queryCall = mockClient.query.mock.calls[0]
      const params = queryCall[1]

      expect(params).toEqual([testId])
      expect(params).toHaveLength(1)
    })

    it('should use parameterized query to prevent SQL injection', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      await getApplicationValidationRun(mockLogger, mockDb, testId)

      const queryCall = mockClient.query.mock.calls[0]
      const sqlQuery = queryCall[0]
      const params = queryCall[1]

      expect(sqlQuery).toContain('$1')
      expect(params).toHaveLength(1)
    })
  })

  describe('return value handling', () => {
    it('should return only the first row from result set', async () => {
      const mockRows = [
        { id: testId, data: 'first', created_at: new Date('2025-01-03') },
        { id: testId, data: 'second', created_at: new Date('2025-01-02') },
        { id: testId, data: 'third', created_at: new Date('2025-01-01') }
      ]

      mockClient.query.mockResolvedValue({ rows: mockRows })

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        testId
      )

      expect(result).toEqual(mockRows[0])
    })

    it('should preserve all fields from database response', async () => {
      const mockApplicationValidationRun = {
        id: testId,
        application_id: 'app-123',
        sbi: 'sbi-456',
        crn: 'crn-789',
        data: { complex: { nested: 'value' } },
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-01-02'),
        extra_field: 'extra_value'
      }

      mockClient.query.mockResolvedValue({
        rows: [mockApplicationValidationRun]
      })

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        testId
      )

      expect(result).toEqual(mockApplicationValidationRun)
      expect(Object.keys(result)).toEqual(
        Object.keys(mockApplicationValidationRun)
      )
    })

    it('should return undefined for empty result set', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      const result = await getApplicationValidationRun(
        mockLogger,
        mockDb,
        testId
      )

      expect(result).toBeUndefined()
    })
  })

  describe('database connection management', () => {
    it('should connect to database and execute query', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      await getApplicationValidationRun(mockLogger, mockDb, testId)

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.query).toHaveBeenCalledTimes(1)
    })

    it('should release client after successful query', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      await getApplicationValidationRun(mockLogger, mockDb, testId)

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    it('should only connect once per call', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      await getApplicationValidationRun(mockLogger, mockDb, testId)

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
    })

    it('should only release once per call', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      await getApplicationValidationRun(mockLogger, mockDb, testId)

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })
  })
})
