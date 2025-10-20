import { getApplicationValidationRuns } from '~/src/api/application/queries/getApplicationValidationRuns.query.js'

describe('getApplicationValidationRuns', () => {
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

  const testApplicationId = 'test-app-123'

  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.connect.mockResolvedValue(mockClient)
  })

  describe('successful data retrieval', () => {
    it('should return array of application validation runs when found', async () => {
      const mockApplicationValidationRuns = [
        {
          id: 'id-1',
          application_id: testApplicationId,
          sbi: 'sbi-456',
          crn: 'crn-789',
          data: { test: 'data1' },
          created_at: new Date('2025-01-03T00:00:00Z')
        },
        {
          id: 'id-2',
          application_id: testApplicationId,
          sbi: 'sbi-456',
          crn: 'crn-789',
          data: { test: 'data2' },
          created_at: new Date('2025-01-02T00:00:00Z')
        },
        {
          id: 'id-3',
          application_id: testApplicationId,
          sbi: 'sbi-456',
          crn: 'crn-789',
          data: { test: 'data3' },
          created_at: new Date('2025-01-01T00:00:00Z')
        }
      ]

      mockClient.query.mockResolvedValue({
        rows: mockApplicationValidationRuns
      })

      const result = await getApplicationValidationRuns(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Connecting to DB to fetch latest application validation runs by application id'
      )
      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM application_results'),
        [testApplicationId.toLowerCase()]
      )
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE application_id = $1'),
        [testApplicationId.toLowerCase()]
      )
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY created_at DESC'),
        [testApplicationId.toLowerCase()]
      )
      expect(mockClient.release).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockApplicationValidationRuns)
      expect(result).toHaveLength(3)
    })

    it('should return empty array when no application validation runs found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      const result = await getApplicationValidationRuns(
        mockLogger,
        mockDb,
        'non-existent-app-id'
      )

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        'non-existent-app-id'
      ])
      expect(mockClient.release).toHaveBeenCalledTimes(1)
      expect(result).toEqual([])
      expect(Array.isArray(result)).toBe(true)
    })

    it('should convert application id to lowercase before querying', async () => {
      const upperCaseAppId = 'TEST-APP-123'
      mockClient.query.mockResolvedValue({ rows: [] })

      await getApplicationValidationRuns(mockLogger, mockDb, upperCaseAppId)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        upperCaseAppId.toLowerCase()
      ])
    })

    it('should return single application validation run in array', async () => {
      const mockApplicationValidationRun = {
        id: 'id-1',
        application_id: testApplicationId,
        sbi: 'sbi-456',
        crn: 'crn-789',
        data: { test: 'data' },
        created_at: new Date('2025-01-01T00:00:00Z')
      }

      mockClient.query.mockResolvedValue({
        rows: [mockApplicationValidationRun]
      })

      const result = await getApplicationValidationRuns(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(result).toEqual([mockApplicationValidationRun])
      expect(result).toHaveLength(1)
    })

    it('should handle application validation runs with complex data', async () => {
      const mockApplicationValidationRuns = [
        {
          id: 'id-1',
          application_id: testApplicationId,
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
              errors: [{ code: 'ERR1', message: 'Error 1' }]
            }
          },
          created_at: new Date('2025-01-01T00:00:00Z')
        }
      ]

      mockClient.query.mockResolvedValue({
        rows: mockApplicationValidationRuns
      })

      const result = await getApplicationValidationRuns(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(result).toEqual(mockApplicationValidationRuns)
      expect(result[0].data).toEqual(mockApplicationValidationRuns[0].data)
    })

    it('should handle application validation runs with null data', async () => {
      const mockApplicationValidationRuns = [
        {
          id: 'id-1',
          application_id: testApplicationId,
          sbi: 'sbi-456',
          crn: 'crn-789',
          data: null,
          created_at: new Date('2025-01-01T00:00:00Z')
        }
      ]

      mockClient.query.mockResolvedValue({
        rows: mockApplicationValidationRuns
      })

      const result = await getApplicationValidationRuns(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(result).toEqual(mockApplicationValidationRuns)
      expect(result[0].data).toBeNull()
    })

    it('should return runs ordered by created_at descending', async () => {
      const mockApplicationValidationRuns = [
        {
          id: 'id-3',
          application_id: testApplicationId,
          created_at: new Date('2025-01-03T00:00:00Z')
        },
        {
          id: 'id-2',
          application_id: testApplicationId,
          created_at: new Date('2025-01-02T00:00:00Z')
        },
        {
          id: 'id-1',
          application_id: testApplicationId,
          created_at: new Date('2025-01-01T00:00:00Z')
        }
      ]

      mockClient.query.mockResolvedValue({
        rows: mockApplicationValidationRuns
      })

      const result = await getApplicationValidationRuns(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(result).toEqual(mockApplicationValidationRuns)
      expect(result[0].id).toBe('id-3')
      expect(result[1].id).toBe('id-2')
      expect(result[2].id).toBe('id-1')
    })
  })

  describe('error handling', () => {
    it('should handle database connection error and return null', async () => {
      const connectionError = new Error('Database connection failed')
      mockDb.connect.mockRejectedValue(connectionError)

      const result = await getApplicationValidationRuns(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error executing get application validation runs by application id query: ${connectionError.message}`
      )
      expect(mockClient.release).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })

    it('should handle query execution error and return null', async () => {
      const queryError = new Error('Query execution failed')
      mockClient.query.mockRejectedValue(queryError)

      const result = await getApplicationValidationRuns(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error executing get application validation runs by application id query: ${queryError.message}`
      )
      expect(mockClient.release).toHaveBeenCalledTimes(1)
      expect(result).toBeNull()
    })

    it('should handle database timeout error and return null', async () => {
      const timeoutError = new Error('Connection timeout')
      mockClient.query.mockRejectedValue(timeoutError)

      const result = await getApplicationValidationRuns(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error executing get application validation runs by application id query: ${timeoutError.message}`
      )
      expect(result).toBeNull()
    })

    it('should release client even when query fails', async () => {
      const queryError = new Error('Query execution failed')
      mockClient.query.mockRejectedValue(queryError)

      await getApplicationValidationRuns(mockLogger, mockDb, testApplicationId)

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    it('should not release client when connection fails', async () => {
      const connectionError = new Error('Connection failed')
      mockDb.connect.mockRejectedValue(connectionError)

      await getApplicationValidationRuns(mockLogger, mockDb, testApplicationId)

      expect(mockClient.release).not.toHaveBeenCalled()
    })

    it('should handle case when client is null', async () => {
      mockDb.connect.mockResolvedValue(null)

      const result = await getApplicationValidationRuns(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(mockClient.release).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })

    it('should handle case when result is null', async () => {
      mockClient.query.mockResolvedValue(null)

      const result = await getApplicationValidationRuns(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'Error executing get application validation runs by application id query:'
        )
      )
      expect(result).toBeNull()
    })
  })

  describe('parameter validation', () => {
    it('should handle uppercase application id', async () => {
      const upperCaseAppId = 'TEST-APP-UPPERCASE'
      mockClient.query.mockResolvedValue({ rows: [] })

      await getApplicationValidationRuns(mockLogger, mockDb, upperCaseAppId)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        'test-app-uppercase'
      ])
    })

    it('should handle lowercase application id', async () => {
      const lowerCaseAppId = 'test-app-lowercase'
      mockClient.query.mockResolvedValue({ rows: [] })

      await getApplicationValidationRuns(mockLogger, mockDb, lowerCaseAppId)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        'test-app-lowercase'
      ])
    })

    it('should handle mixed case application id', async () => {
      const mixedCaseAppId = 'TeSt-ApP-mIxEd'
      mockClient.query.mockResolvedValue({ rows: [] })

      await getApplicationValidationRuns(mockLogger, mockDb, mixedCaseAppId)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        'test-app-mixed'
      ])
    })

    it('should handle null application id', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      const result = await getApplicationValidationRuns(
        mockLogger,
        mockDb,
        null
      )

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        undefined
      ])
      expect(result).toEqual([])
    })

    it('should handle undefined application id', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      const result = await getApplicationValidationRuns(
        mockLogger,
        mockDb,
        undefined
      )

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        undefined
      ])
      expect(result).toEqual([])
    })

    it('should handle empty string application id', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      const result = await getApplicationValidationRuns(mockLogger, mockDb, '')

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [''])
      expect(result).toEqual([])
    })

    it('should handle application id with special characters', async () => {
      const specialCharsAppId = 'app-123!@#$%'
      mockClient.query.mockResolvedValue({ rows: [] })

      await getApplicationValidationRuns(mockLogger, mockDb, specialCharsAppId)

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        specialCharsAppId.toLowerCase()
      ])
    })
  })

  describe('logging', () => {
    it('should log info message when connecting to database', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      await getApplicationValidationRuns(mockLogger, mockDb, testApplicationId)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Connecting to DB to fetch latest application validation runs by application id'
      )
      expect(mockLogger.info).toHaveBeenCalledTimes(1)
    })

    it('should log error message with correct format on failure', async () => {
      const testError = new Error('Specific test error')
      mockClient.query.mockRejectedValue(testError)

      await getApplicationValidationRuns(mockLogger, mockDb, testApplicationId)

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error executing get application validation runs by application id query: Specific test error'
      )
      expect(mockLogger.error).toHaveBeenCalledTimes(1)
    })

    it('should not log error message on successful query', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      await getApplicationValidationRuns(mockLogger, mockDb, testApplicationId)

      expect(mockLogger.error).not.toHaveBeenCalled()
    })
  })

  describe('database query structure', () => {
    it('should use correct SQL query with ORDER BY', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      await getApplicationValidationRuns(mockLogger, mockDb, testApplicationId)

      const queryCall = mockClient.query.mock.calls[0]
      const sqlQuery = queryCall[0]

      expect(sqlQuery).toContain('SELECT * FROM application_results')
      expect(sqlQuery).toContain('WHERE application_id = $1')
      expect(sqlQuery).toContain('ORDER BY created_at DESC')
      expect(sqlQuery).not.toContain('LIMIT')
    })

    it('should pass application id parameter correctly', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      await getApplicationValidationRuns(mockLogger, mockDb, testApplicationId)

      const queryCall = mockClient.query.mock.calls[0]
      const params = queryCall[1]

      expect(params).toEqual([testApplicationId.toLowerCase()])
      expect(params).toHaveLength(1)
    })

    it('should use parameterized query to prevent SQL injection', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      await getApplicationValidationRuns(mockLogger, mockDb, testApplicationId)

      const queryCall = mockClient.query.mock.calls[0]
      const sqlQuery = queryCall[0]
      const params = queryCall[1]

      expect(sqlQuery).toContain('$1')
      expect(params).toHaveLength(1)
    })
  })

  describe('return value handling', () => {
    it('should return all rows from result set', async () => {
      const mockRows = [
        {
          id: 'id-1',
          application_id: testApplicationId,
          created_at: new Date('2025-01-03')
        },
        {
          id: 'id-2',
          application_id: testApplicationId,
          created_at: new Date('2025-01-02')
        },
        {
          id: 'id-3',
          application_id: testApplicationId,
          created_at: new Date('2025-01-01')
        }
      ]

      mockClient.query.mockResolvedValue({ rows: mockRows })

      const result = await getApplicationValidationRuns(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(result).toEqual(mockRows)
      expect(result).toHaveLength(3)
    })

    it('should preserve all fields from database response', async () => {
      const mockApplicationValidationRuns = [
        {
          id: 'id-1',
          application_id: testApplicationId,
          sbi: 'sbi-456',
          crn: 'crn-789',
          data: { complex: { nested: 'value' } },
          created_at: new Date('2025-01-01'),
          updated_at: new Date('2025-01-02'),
          extra_field: 'extra_value'
        }
      ]

      mockClient.query.mockResolvedValue({
        rows: mockApplicationValidationRuns
      })

      const result = await getApplicationValidationRuns(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(result).toEqual(mockApplicationValidationRuns)
      expect(Object.keys(result[0])).toEqual(
        Object.keys(mockApplicationValidationRuns[0])
      )
    })

    it('should return empty array for empty result set', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      const result = await getApplicationValidationRuns(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(result).toEqual([])
      expect(Array.isArray(result)).toBe(true)
    })

    it('should return array with multiple validation runs', async () => {
      const mockRows = Array.from({ length: 10 }, (_, i) => ({
        id: `id-${i}`,
        application_id: testApplicationId,
        created_at: new Date(`2025-01-${10 - i}`)
      }))

      mockClient.query.mockResolvedValue({ rows: mockRows })

      const result = await getApplicationValidationRuns(
        mockLogger,
        mockDb,
        testApplicationId
      )

      expect(result).toEqual(mockRows)
      expect(result).toHaveLength(10)
    })
  })

  describe('database connection management', () => {
    it('should connect to database and execute query', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      await getApplicationValidationRuns(mockLogger, mockDb, testApplicationId)

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.query).toHaveBeenCalledTimes(1)
    })

    it('should release client after successful query', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      await getApplicationValidationRuns(mockLogger, mockDb, testApplicationId)

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    it('should only connect once per call', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      await getApplicationValidationRuns(mockLogger, mockDb, testApplicationId)

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
    })

    it('should only release once per call', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      await getApplicationValidationRuns(mockLogger, mockDb, testApplicationId)

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })
  })
})
