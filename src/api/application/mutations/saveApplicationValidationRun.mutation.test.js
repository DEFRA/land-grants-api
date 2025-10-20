import { saveApplicationValidationRun } from '~/src/api/application/mutations/saveApplicationValidationRun.mutation.js'

describe('saveApplicationValidationRun', () => {
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

  const mockApplicationValidationRun = {
    application_id: 'app-123',
    sbi: 'sbi-456',
    crn: 'crn-789',
    data: { test: 'data' }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.connect.mockResolvedValue(mockClient)
  })

  describe('successful data insertion', () => {
    it('should save application validation run and return the full row', async () => {
      const mockDbResponse = {
        rows: [
          {
            id: 'generated-id-123',
            application_id: mockApplicationValidationRun.application_id,
            sbi: mockApplicationValidationRun.sbi,
            crn: mockApplicationValidationRun.crn,
            data: mockApplicationValidationRun.data,
            created_at: new Date('2025-01-01T00:00:00Z')
          }
        ]
      }

      mockClient.query.mockResolvedValue(mockDbResponse)

      const result = await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        mockApplicationValidationRun
      )

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Connecting to DB to save application validation run'
      )
      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining(
          'INSERT INTO application_results (application_id, sbi, crn, data)'
        ),
        [
          mockApplicationValidationRun.application_id,
          mockApplicationValidationRun.sbi,
          mockApplicationValidationRun.crn,
          mockApplicationValidationRun.data
        ]
      )
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('VALUES ($1, $2, $3, $4)'),
        expect.any(Array)
      )
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('RETURNING *'),
        expect.any(Array)
      )
      expect(mockClient.release).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockDbResponse.rows[0])
    })

    it('should handle application validation run with null data field', async () => {
      const applicationWithNullData = {
        application_id: 'app-456',
        sbi: 'sbi-789',
        crn: 'crn-012',
        data: null
      }

      const mockDbResponse = {
        rows: [
          {
            id: 'generated-id-456',
            application_id: applicationWithNullData.application_id,
            sbi: applicationWithNullData.sbi,
            crn: applicationWithNullData.crn,
            data: null,
            created_at: new Date('2025-01-01T00:00:00Z')
          }
        ]
      }

      mockClient.query.mockResolvedValue(mockDbResponse)

      const result = await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        applicationWithNullData
      )

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        applicationWithNullData.application_id,
        applicationWithNullData.sbi,
        applicationWithNullData.crn,
        null
      ])
      expect(result).toEqual(mockDbResponse.rows[0])
    })

    it('should handle application validation run with complex data object', async () => {
      const applicationWithComplexData = {
        application_id: 'app-789',
        sbi: 'sbi-012',
        crn: 'crn-345',
        data: {
          nested: {
            structure: {
              with: 'values',
              and: ['arrays', 'too']
            }
          },
          multiple: 'fields',
          validationResults: {
            passed: true,
            errors: []
          }
        }
      }

      const mockDbResponse = {
        rows: [
          {
            id: 'generated-id-789',
            application_id: applicationWithComplexData.application_id,
            sbi: applicationWithComplexData.sbi,
            crn: applicationWithComplexData.crn,
            data: applicationWithComplexData.data,
            created_at: new Date('2025-01-01T00:00:00Z')
          }
        ]
      }

      mockClient.query.mockResolvedValue(mockDbResponse)

      const result = await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        applicationWithComplexData
      )

      expect(result).toEqual(mockDbResponse.rows[0])
      expect(result.data).toEqual(applicationWithComplexData.data)
    })

    it('should return full row with all database fields', async () => {
      const mockDbResponse = {
        rows: [
          {
            id: 'db-generated-id',
            application_id: mockApplicationValidationRun.application_id,
            sbi: mockApplicationValidationRun.sbi,
            crn: mockApplicationValidationRun.crn,
            data: mockApplicationValidationRun.data,
            created_at: new Date('2025-01-15T12:34:56Z'),
            updated_at: new Date('2025-01-15T12:34:56Z')
          }
        ]
      }

      mockClient.query.mockResolvedValue(mockDbResponse)

      const result = await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        mockApplicationValidationRun
      )

      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('application_id')
      expect(result).toHaveProperty('sbi')
      expect(result).toHaveProperty('crn')
      expect(result).toHaveProperty('data')
      expect(result).toHaveProperty('created_at')
      expect(result).toHaveProperty('updated_at')
    })
  })

  describe('error handling', () => {
    it('should handle database connection error and return null', async () => {
      const connectionError = new Error('Database connection failed')
      mockDb.connect.mockRejectedValue(connectionError)

      const result = await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        mockApplicationValidationRun
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error executing save application validation run mutation: ${connectionError.message}`
      )
      expect(mockClient.release).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })

    it('should handle query execution error and return null', async () => {
      const queryError = new Error('Query execution failed')
      mockClient.query.mockRejectedValue(queryError)

      const result = await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        mockApplicationValidationRun
      )

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error executing save application validation run mutation: ${queryError.message}`
      )
      expect(mockClient.release).toHaveBeenCalledTimes(1)
      expect(result).toBeNull()
    })

    it('should handle constraint violation error and return null', async () => {
      const constraintError = new Error(
        'duplicate key value violates unique constraint'
      )
      mockClient.query.mockRejectedValue(constraintError)

      const result = await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        mockApplicationValidationRun
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error executing save application validation run mutation: ${constraintError.message}`
      )
      expect(mockClient.release).toHaveBeenCalledTimes(1)
      expect(result).toBeNull()
    })

    it('should release client even when query fails', async () => {
      const queryError = new Error('Query execution failed')
      mockClient.query.mockRejectedValue(queryError)

      await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        mockApplicationValidationRun
      )

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    it('should not release client when connection fails', async () => {
      const connectionError = new Error('Connection failed')
      mockDb.connect.mockRejectedValue(connectionError)

      await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        mockApplicationValidationRun
      )

      expect(mockClient.release).not.toHaveBeenCalled()
    })

    it('should handle case when client is null', async () => {
      mockDb.connect.mockResolvedValue(null)

      const result = await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        mockApplicationValidationRun
      )

      expect(mockClient.release).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })

    it('should handle error when result.rows is empty and return undefined', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      const result = await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        mockApplicationValidationRun
      )

      expect(mockClient.release).toHaveBeenCalledTimes(1)
      expect(result).toBeUndefined()
    })

    it('should handle database timeout error', async () => {
      const timeoutError = new Error('Connection timeout')
      mockClient.query.mockRejectedValue(timeoutError)

      const result = await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        mockApplicationValidationRun
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error executing save application validation run mutation: ${timeoutError.message}`
      )
      expect(result).toBeNull()
    })
  })

  describe('parameter validation', () => {
    it('should handle application validation run with undefined fields', async () => {
      const applicationWithUndefined = {
        application_id: undefined,
        sbi: undefined,
        crn: undefined,
        data: undefined
      }

      const mockDbResponse = {
        rows: [
          {
            id: 'generated-id-undef',
            application_id: undefined,
            sbi: undefined,
            crn: undefined,
            data: undefined
          }
        ]
      }

      mockClient.query.mockResolvedValue(mockDbResponse)

      const result = await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        applicationWithUndefined
      )

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        undefined,
        undefined,
        undefined,
        undefined
      ])
      expect(result).toEqual(mockDbResponse.rows[0])
    })

    it('should handle application validation run with empty strings', async () => {
      const applicationWithEmptyStrings = {
        application_id: '',
        sbi: '',
        crn: '',
        data: {}
      }

      const mockDbResponse = {
        rows: [
          {
            id: 'generated-id-empty',
            application_id: '',
            sbi: '',
            crn: '',
            data: {}
          }
        ]
      }

      mockClient.query.mockResolvedValue(mockDbResponse)

      const result = await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        applicationWithEmptyStrings
      )

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        '',
        '',
        '',
        {}
      ])
      expect(result).toEqual(mockDbResponse.rows[0])
    })

    it('should handle application validation run with numeric ids', async () => {
      const applicationWithNumericIds = {
        application_id: 12345,
        sbi: 67890,
        crn: 11111,
        data: { numeric: true }
      }

      const mockDbResponse = {
        rows: [
          {
            id: 999,
            application_id: applicationWithNumericIds.application_id,
            sbi: applicationWithNumericIds.sbi,
            crn: applicationWithNumericIds.crn,
            data: applicationWithNumericIds.data
          }
        ]
      }

      mockClient.query.mockResolvedValue(mockDbResponse)

      const result = await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        applicationWithNumericIds
      )

      expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
        12345,
        67890,
        11111,
        { numeric: true }
      ])
      expect(result).toEqual(mockDbResponse.rows[0])
    })

    it('should handle application validation run with special characters in data', async () => {
      const applicationWithSpecialChars = {
        application_id: "app-with-'quotes'",
        sbi: 'sbi-123',
        crn: 'crn-456',
        data: {
          description: 'Field with \'single\' and "double" quotes',
          sql: 'SELECT * FROM table WHERE id = $1',
          special: 'test\nwith\nnewlines'
        }
      }

      const mockDbResponse = {
        rows: [
          {
            id: 'special-id',
            application_id: applicationWithSpecialChars.application_id,
            sbi: applicationWithSpecialChars.sbi,
            crn: applicationWithSpecialChars.crn,
            data: applicationWithSpecialChars.data
          }
        ]
      }

      mockClient.query.mockResolvedValue(mockDbResponse)

      const result = await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        applicationWithSpecialChars
      )

      expect(result.data).toEqual(applicationWithSpecialChars.data)
    })
  })

  describe('logging', () => {
    it('should log info message when connecting to database', async () => {
      const mockDbResponse = {
        rows: [
          {
            id: 'test-id',
            application_id: mockApplicationValidationRun.application_id,
            sbi: mockApplicationValidationRun.sbi,
            crn: mockApplicationValidationRun.crn,
            data: mockApplicationValidationRun.data
          }
        ]
      }

      mockClient.query.mockResolvedValue(mockDbResponse)

      await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        mockApplicationValidationRun
      )

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Connecting to DB to save application validation run'
      )
      expect(mockLogger.info).toHaveBeenCalledTimes(1)
    })

    it('should log error message with correct format on failure', async () => {
      const testError = new Error('Specific test error')
      mockClient.query.mockRejectedValue(testError)

      await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        mockApplicationValidationRun
      )

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error executing save application validation run mutation: Specific test error'
      )
      expect(mockLogger.error).toHaveBeenCalledTimes(1)
    })

    it('should not log multiple error messages on single failure', async () => {
      const testError = new Error('Single error')
      mockClient.query.mockRejectedValue(testError)

      await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        mockApplicationValidationRun
      )

      expect(mockLogger.error).toHaveBeenCalledTimes(1)
    })
  })

  describe('database query structure', () => {
    it('should use correct SQL query structure', async () => {
      const mockDbResponse = {
        rows: [{ id: 'test-id' }]
      }

      mockClient.query.mockResolvedValue(mockDbResponse)

      await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        mockApplicationValidationRun
      )

      const queryCall = mockClient.query.mock.calls[0]
      const sqlQuery = queryCall[0]

      expect(sqlQuery).toContain('INSERT INTO application_results')
      expect(sqlQuery).toContain('application_id')
      expect(sqlQuery).toContain('sbi')
      expect(sqlQuery).toContain('crn')
      expect(sqlQuery).toContain('data')
      expect(sqlQuery).toContain('VALUES')
      expect(sqlQuery).toContain('$1')
      expect(sqlQuery).toContain('$2')
      expect(sqlQuery).toContain('$3')
      expect(sqlQuery).toContain('$4')
      expect(sqlQuery).toContain('RETURNING *')
    })

    it('should pass parameters in correct order', async () => {
      const mockDbResponse = {
        rows: [{ id: 'test-id' }]
      }

      mockClient.query.mockResolvedValue(mockDbResponse)

      await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        mockApplicationValidationRun
      )

      const queryCall = mockClient.query.mock.calls[0]
      const params = queryCall[1]

      expect(params[0]).toBe(mockApplicationValidationRun.application_id)
      expect(params[1]).toBe(mockApplicationValidationRun.sbi)
      expect(params[2]).toBe(mockApplicationValidationRun.crn)
      expect(params[3]).toBe(mockApplicationValidationRun.data)
      expect(params).toHaveLength(4)
    })

    it('should use parameterized query to prevent SQL injection', async () => {
      const mockDbResponse = {
        rows: [{ id: 'safe-id' }]
      }

      mockClient.query.mockResolvedValue(mockDbResponse)

      await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        mockApplicationValidationRun
      )

      const queryCall = mockClient.query.mock.calls[0]
      const sqlQuery = queryCall[0]
      const params = queryCall[1]

      // Verify parameterized query is used
      expect(sqlQuery).toContain('$1')
      expect(sqlQuery).toContain('$2')
      expect(sqlQuery).toContain('$3')
      expect(sqlQuery).toContain('$4')
      expect(params).toHaveLength(4)
    })
  })

  describe('return value handling', () => {
    it('should return the first row from database result', async () => {
      const mockDbResponse = {
        rows: [
          { id: 'first-id', data: 'first' },
          { id: 'second-id', data: 'second' },
          { id: 'third-id', data: 'third' }
        ]
      }

      mockClient.query.mockResolvedValue(mockDbResponse)

      const result = await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        mockApplicationValidationRun
      )

      expect(result).toEqual(mockDbResponse.rows[0])
      expect(result.id).toBe('first-id')
    })

    it('should return full object with numeric id if database returns number', async () => {
      const mockDbResponse = {
        rows: [
          {
            id: 42,
            application_id: 'app-123',
            sbi: 'sbi-456',
            crn: 'crn-789',
            data: { test: true }
          }
        ]
      }

      mockClient.query.mockResolvedValue(mockDbResponse)

      const result = await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        mockApplicationValidationRun
      )

      expect(result).toEqual(mockDbResponse.rows[0])
      expect(result.id).toBe(42)
      expect(typeof result.id).toBe('number')
    })

    it('should return full object with string id if database returns string', async () => {
      const mockDbResponse = {
        rows: [
          {
            id: 'string-id-123',
            application_id: 'app-123',
            sbi: 'sbi-456',
            crn: 'crn-789',
            data: { test: true }
          }
        ]
      }

      mockClient.query.mockResolvedValue(mockDbResponse)

      const result = await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        mockApplicationValidationRun
      )

      expect(result).toEqual(mockDbResponse.rows[0])
      expect(result.id).toBe('string-id-123')
      expect(typeof result.id).toBe('string')
    })

    it('should preserve all fields from database response', async () => {
      const mockDbResponse = {
        rows: [
          {
            id: 'test-id',
            application_id: 'app-123',
            sbi: 'sbi-456',
            crn: 'crn-789',
            data: { complex: { nested: 'value' } },
            created_at: new Date('2025-01-01'),
            updated_at: new Date('2025-01-02'),
            extra_field: 'extra_value'
          }
        ]
      }

      mockClient.query.mockResolvedValue(mockDbResponse)

      const result = await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        mockApplicationValidationRun
      )

      expect(result).toEqual(mockDbResponse.rows[0])
      expect(Object.keys(result)).toEqual(Object.keys(mockDbResponse.rows[0]))
    })
  })

  describe('database connection management', () => {
    it('should connect to database and execute query', async () => {
      const mockDbResponse = {
        rows: [{ id: 'test-id' }]
      }

      mockClient.query.mockResolvedValue(mockDbResponse)

      await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        mockApplicationValidationRun
      )

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.query).toHaveBeenCalledTimes(1)
    })

    it('should release client after successful query', async () => {
      const mockDbResponse = {
        rows: [{ id: 'test-id' }]
      }

      mockClient.query.mockResolvedValue(mockDbResponse)

      await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        mockApplicationValidationRun
      )

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    it('should only connect once per call', async () => {
      const mockDbResponse = {
        rows: [{ id: 'test-id' }]
      }

      mockClient.query.mockResolvedValue(mockDbResponse)

      await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        mockApplicationValidationRun
      )

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
    })

    it('should only release once per call', async () => {
      const mockDbResponse = {
        rows: [{ id: 'test-id' }]
      }

      mockClient.query.mockResolvedValue(mockDbResponse)

      await saveApplicationValidationRun(
        mockLogger,
        mockDb,
        mockApplicationValidationRun
      )

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })
  })
})
