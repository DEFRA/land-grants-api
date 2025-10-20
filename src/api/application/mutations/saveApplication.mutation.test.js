import { saveApplication } from '~/src/api/application/mutations/saveApplication.mutation.js'

describe('saveApplication', () => {
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

  const mockApplication = {
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
    it('should save application and return the id', async () => {
      const mockDbResponse = {
        rows: [
          {
            id: 'generated-id-123',
            application_id: mockApplication.application_id,
            sbi: mockApplication.sbi,
            crn: mockApplication.crn,
            data: mockApplication.data
          }
        ]
      }

      mockClient.query.mockResolvedValue(mockDbResponse)

      const result = await saveApplication(mockLogger, mockDb, mockApplication)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Connecting to DB to save application'
      )
      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining(
          'INSERT INTO application_results (application_id, sbi, crn, data)'
        ),
        [
          mockApplication.application_id,
          mockApplication.sbi,
          mockApplication.crn,
          mockApplication.data
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
      expect(result).toBe('generated-id-123')
    })

    it('should handle application with null data field', async () => {
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
            data: null
          }
        ]
      }

      mockClient.query.mockResolvedValue(mockDbResponse)

      const result = await saveApplication(
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
      expect(result).toBe('generated-id-456')
    })

    it('should handle application with complex data object', async () => {
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
          multiple: 'fields'
        }
      }

      const mockDbResponse = {
        rows: [
          {
            id: 'generated-id-789',
            application_id: applicationWithComplexData.application_id,
            sbi: applicationWithComplexData.sbi,
            crn: applicationWithComplexData.crn,
            data: applicationWithComplexData.data
          }
        ]
      }

      mockClient.query.mockResolvedValue(mockDbResponse)

      const result = await saveApplication(
        mockLogger,
        mockDb,
        applicationWithComplexData
      )

      expect(result).toBe('generated-id-789')
    })
  })

  describe('error handling', () => {
    it('should handle database connection error and return null', async () => {
      const connectionError = new Error('Database connection failed')
      mockDb.connect.mockRejectedValue(connectionError)

      const result = await saveApplication(mockLogger, mockDb, mockApplication)

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error executing get action query: ${connectionError.message}`
      )
      expect(mockClient.release).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })

    it('should handle query execution error and return null', async () => {
      const queryError = new Error('Query execution failed')
      mockClient.query.mockRejectedValue(queryError)

      const result = await saveApplication(mockLogger, mockDb, mockApplication)

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error executing get action query: ${queryError.message}`
      )
      expect(mockClient.release).toHaveBeenCalledTimes(1)
      expect(result).toBeNull()
    })

    it('should handle constraint violation error and return null', async () => {
      const constraintError = new Error(
        'duplicate key value violates unique constraint'
      )
      mockClient.query.mockRejectedValue(constraintError)

      const result = await saveApplication(mockLogger, mockDb, mockApplication)

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error executing get action query: ${constraintError.message}`
      )
      expect(mockClient.release).toHaveBeenCalledTimes(1)
      expect(result).toBeNull()
    })

    it('should release client even when query fails', async () => {
      const queryError = new Error('Query execution failed')
      mockClient.query.mockRejectedValue(queryError)

      await saveApplication(mockLogger, mockDb, mockApplication)

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    it('should not release client when connection fails', async () => {
      const connectionError = new Error('Connection failed')
      mockDb.connect.mockRejectedValue(connectionError)

      await saveApplication(mockLogger, mockDb, mockApplication)

      expect(mockClient.release).not.toHaveBeenCalled()
    })

    it('should handle case when client is null', async () => {
      mockDb.connect.mockResolvedValue(null)

      const result = await saveApplication(mockLogger, mockDb, mockApplication)

      expect(mockClient.release).not.toHaveBeenCalled()
      expect(result).toBeNull()
    })

    it('should handle error when result.rows is empty and return null', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      const result = await saveApplication(mockLogger, mockDb, mockApplication)

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error executing get action query:')
      )
      expect(mockClient.release).toHaveBeenCalledTimes(1)
      expect(result).toBeNull()
    })
  })

  describe('parameter validation', () => {
    it('should handle application with undefined fields', async () => {
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

      const result = await saveApplication(
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
      expect(result).toBe('generated-id-undef')
    })

    it('should handle application with empty strings', async () => {
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

      const result = await saveApplication(
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
      expect(result).toBe('generated-id-empty')
    })

    it('should handle application with numeric ids', async () => {
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

      const result = await saveApplication(
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
      expect(result).toBe(999)
    })
  })

  describe('logging', () => {
    it('should log info message when connecting to database', async () => {
      const mockDbResponse = {
        rows: [
          {
            id: 'test-id',
            application_id: mockApplication.application_id,
            sbi: mockApplication.sbi,
            crn: mockApplication.crn,
            data: mockApplication.data
          }
        ]
      }

      mockClient.query.mockResolvedValue(mockDbResponse)

      await saveApplication(mockLogger, mockDb, mockApplication)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Connecting to DB to save application'
      )
      expect(mockLogger.info).toHaveBeenCalledTimes(1)
    })

    it('should log error message with correct format on failure', async () => {
      const testError = new Error('Specific test error')
      mockClient.query.mockRejectedValue(testError)

      await saveApplication(mockLogger, mockDb, mockApplication)

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error executing get action query: Specific test error'
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

      await saveApplication(mockLogger, mockDb, mockApplication)

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

      await saveApplication(mockLogger, mockDb, mockApplication)

      const queryCall = mockClient.query.mock.calls[0]
      const params = queryCall[1]

      expect(params[0]).toBe(mockApplication.application_id)
      expect(params[1]).toBe(mockApplication.sbi)
      expect(params[2]).toBe(mockApplication.crn)
      expect(params[3]).toBe(mockApplication.data)
      expect(params).toHaveLength(4)
    })
  })

  describe('return value handling', () => {
    it('should return the id from the first row', async () => {
      const mockDbResponse = {
        rows: [{ id: 'first-id' }, { id: 'second-id' }, { id: 'third-id' }]
      }

      mockClient.query.mockResolvedValue(mockDbResponse)

      const result = await saveApplication(mockLogger, mockDb, mockApplication)

      expect(result).toBe('first-id')
    })

    it('should return numeric id if database returns number', async () => {
      const mockDbResponse = {
        rows: [{ id: 42 }]
      }

      mockClient.query.mockResolvedValue(mockDbResponse)

      const result = await saveApplication(mockLogger, mockDb, mockApplication)

      expect(result).toBe(42)
      expect(typeof result).toBe('number')
    })

    it('should return string id if database returns string', async () => {
      const mockDbResponse = {
        rows: [{ id: 'string-id-123' }]
      }

      mockClient.query.mockResolvedValue(mockDbResponse)

      const result = await saveApplication(mockLogger, mockDb, mockApplication)

      expect(result).toBe('string-id-123')
      expect(typeof result).toBe('string')
    })
  })
})
