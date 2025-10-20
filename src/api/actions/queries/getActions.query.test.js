import { getEnabledActions } from '~/src/api/actions/queries/getActions.query.js'
import { actionConfigTransformer } from '~/src/api/actions/transformers/actionConfig.transformer.js'

jest.mock('~/src/api/actions/transformers/actionConfig.transformer.js')

describe('getEnabledActions', () => {
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

  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.connect.mockResolvedValue(mockClient)
    actionConfigTransformer.mockImplementation((action) => ({
      ...action,
      transformed: true
    }))
  })

  describe('successful data retrieval', () => {
    it('should return enabled actions when found', async () => {
      const mockDbActions = [
        {
          code: 'CMOR1',
          name: 'Create or restore wetland',
          enabled: true,
          version: 1,
          start_date: '2024-01-01',
          application_unit_of_measurement: 'hectares',
          duration_years: 3,
          payment: { rate: 100 },
          land_cover_class_codes: ['LC001'],
          rules: {},
          last_updated: new Date('2024-01-01T00:00:00Z')
        },
        {
          code: 'SPM4',
          name: 'Enhanced winter bird food',
          enabled: true,
          version: 1,
          start_date: '2024-01-01',
          application_unit_of_measurement: 'hectares',
          duration_years: 2,
          payment: { rate: 200 },
          land_cover_class_codes: ['LC002'],
          rules: {},
          last_updated: new Date('2024-01-01T00:00:00Z')
        }
      ]

      const transformedActions = mockDbActions.map((action) => ({
        ...action,
        transformed: true
      }))

      mockClient.query.mockResolvedValue({ rows: mockDbActions })

      const result = await getEnabledActions(mockLogger, mockDb)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Connecting to DB to fetch actions'
      )
      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT')
      )
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM actions a')
      )
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('JOIN actions_config ac ON a.code = ac.code')
      )
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining(
          'WHERE a.enabled = TRUE AND ac.is_active = TRUE'
        )
      )
      expect(mockClient.release).toHaveBeenCalledTimes(1)
      expect(actionConfigTransformer).toHaveBeenCalledTimes(2)
      expect(result).toEqual(transformedActions)
    })

    it('should return single enabled action', async () => {
      const mockDbAction = [
        {
          code: 'CMOR1',
          name: 'Create or restore wetland',
          enabled: true,
          version: 1,
          start_date: '2024-01-01',
          application_unit_of_measurement: 'hectares',
          duration_years: 3,
          payment: { rate: 100 },
          land_cover_class_codes: ['LC001'],
          rules: {},
          last_updated: new Date('2024-01-01T00:00:00Z')
        }
      ]

      mockClient.query.mockResolvedValue({ rows: mockDbAction })

      const result = await getEnabledActions(mockLogger, mockDb)

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.release).toHaveBeenCalledTimes(1)
      expect(actionConfigTransformer).toHaveBeenCalledTimes(1)
      expect(actionConfigTransformer).toHaveBeenCalledWith(
        mockDbAction[0],
        0,
        mockDbAction
      )
      expect(result).toHaveLength(1)
    })

    it('should return empty array when no enabled actions found', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      const result = await getEnabledActions(mockLogger, mockDb)

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.query).toHaveBeenCalledTimes(1)
      expect(mockClient.release).toHaveBeenCalledTimes(1)
      expect(actionConfigTransformer).not.toHaveBeenCalled()
      expect(result).toEqual([])
    })

    it('should transform all returned actions using actionConfigTransformer', async () => {
      const mockDbActions = [
        {
          code: 'CMOR1',
          name: 'Action 1',
          enabled: true
        },
        {
          code: 'SPM4',
          name: 'Action 2',
          enabled: true
        }
      ]

      mockClient.query.mockResolvedValue({ rows: mockDbActions })

      await getEnabledActions(mockLogger, mockDb)

      expect(actionConfigTransformer).toHaveBeenCalledTimes(2)
      expect(actionConfigTransformer).toHaveBeenNthCalledWith(
        1,
        mockDbActions[0],
        0,
        mockDbActions
      )
      expect(actionConfigTransformer).toHaveBeenNthCalledWith(
        2,
        mockDbActions[1],
        1,
        mockDbActions
      )
    })

    it('should handle actions with complex payment objects', async () => {
      const mockDbAction = [
        {
          code: 'CMOR1',
          name: 'Create or restore wetland',
          enabled: true,
          version: 1,
          start_date: '2024-01-01',
          application_unit_of_measurement: 'hectares',
          duration_years: 3,
          payment: {
            rate: 100,
            tiers: [
              { min: 0, max: 10, rate: 100 },
              { min: 10, max: 50, rate: 90 }
            ]
          },
          land_cover_class_codes: ['LC001', 'LC002'],
          rules: {
            eligibility: {
              minArea: 0.5
            }
          },
          last_updated: new Date('2024-01-01T00:00:00Z')
        }
      ]

      mockClient.query.mockResolvedValue({ rows: mockDbAction })

      const result = await getEnabledActions(mockLogger, mockDb)

      expect(result).toHaveLength(1)
      expect(actionConfigTransformer).toHaveBeenCalledWith(
        mockDbAction[0],
        0,
        mockDbAction
      )
    })
  })

  describe('error handling', () => {
    it('should handle database connection error and return empty array', async () => {
      const connectionError = new Error('Database connection failed')
      mockDb.connect.mockRejectedValue(connectionError)

      const result = await getEnabledActions(mockLogger, mockDb)

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error executing get action query: ${connectionError.message}`
      )
      expect(mockClient.release).not.toHaveBeenCalled()
      expect(result).toEqual([])
    })

    it('should handle query execution error and return empty array', async () => {
      const queryError = new Error('Query execution failed')
      mockClient.query.mockRejectedValue(queryError)

      const result = await getEnabledActions(mockLogger, mockDb)

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error executing get action query: ${queryError.message}`
      )
      expect(mockClient.release).toHaveBeenCalledTimes(1)
      expect(result).toEqual([])
    })

    it('should handle database timeout error and return empty array', async () => {
      const timeoutError = new Error('Connection timeout')
      mockClient.query.mockRejectedValue(timeoutError)

      const result = await getEnabledActions(mockLogger, mockDb)

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error executing get action query: ${timeoutError.message}`
      )
      expect(result).toEqual([])
    })

    it('should release client even when query fails', async () => {
      const queryError = new Error('Query execution failed')
      mockClient.query.mockRejectedValue(queryError)

      await getEnabledActions(mockLogger, mockDb)

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    it('should not release client when connection fails', async () => {
      const connectionError = new Error('Connection failed')
      mockDb.connect.mockRejectedValue(connectionError)

      await getEnabledActions(mockLogger, mockDb)

      expect(mockClient.release).not.toHaveBeenCalled()
    })

    it('should handle case when client is null', async () => {
      mockDb.connect.mockResolvedValue(null)

      const result = await getEnabledActions(mockLogger, mockDb)

      expect(mockClient.release).not.toHaveBeenCalled()
      expect(result).toEqual([])
    })

    it('should handle transformer errors and propagate them', async () => {
      const mockDbAction = [
        {
          code: 'CMOR1',
          name: 'Create or restore wetland'
        }
      ]

      const transformerError = new Error('Transformer failed')
      mockClient.query.mockResolvedValue({ rows: mockDbAction })
      actionConfigTransformer.mockImplementation(() => {
        throw transformerError
      })

      const result = await getEnabledActions(mockLogger, mockDb)

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error executing get action query: ${transformerError.message}`
      )
      expect(mockClient.release).toHaveBeenCalledTimes(1)
      expect(result).toEqual([])
    })
  })

  describe('logging', () => {
    it('should log info message when connecting to database', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      await getEnabledActions(mockLogger, mockDb)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Connecting to DB to fetch actions'
      )
      expect(mockLogger.info).toHaveBeenCalledTimes(1)
    })

    it('should log error message with correct format on failure', async () => {
      const testError = new Error('Specific test error')
      mockClient.query.mockRejectedValue(testError)

      await getEnabledActions(mockLogger, mockDb)

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error executing get action query: Specific test error'
      )
      expect(mockLogger.error).toHaveBeenCalledTimes(1)
    })

    it('should not log error message on successful query', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      await getEnabledActions(mockLogger, mockDb)

      expect(mockLogger.error).not.toHaveBeenCalled()
    })
  })

  describe('database query structure', () => {
    it('should query with correct SQL structure', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      await getEnabledActions(mockLogger, mockDb)

      const queryCall = mockClient.query.mock.calls[0]
      const sqlQuery = queryCall[0]

      expect(sqlQuery).toContain('SELECT')
      expect(sqlQuery).toContain('a.*')
      expect(sqlQuery).toContain('ac.version')
      expect(sqlQuery).toContain("ac.config->>'start_date' as start_date")
      expect(sqlQuery).toContain(
        "ac.config->>'application_unit_of_measurement' as application_unit_of_measurement"
      )
      expect(sqlQuery).toContain(
        "(ac.config->>'duration_years')::numeric as duration_years"
      )
      expect(sqlQuery).toContain("ac.config->'payment' as payment")
      expect(sqlQuery).toContain(
        "ac.config->'land_cover_class_codes' as land_cover_class_codes"
      )
      expect(sqlQuery).toContain("ac.config->'rules' as rules")
      expect(sqlQuery).toContain('ac.last_updated_at as last_updated')
      expect(sqlQuery).toContain('FROM actions a')
      expect(sqlQuery).toContain('JOIN actions_config ac ON a.code = ac.code')
      expect(sqlQuery).toContain(
        'WHERE a.enabled = TRUE AND ac.is_active = TRUE'
      )
    })

    it('should not pass any parameters to the query', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      await getEnabledActions(mockLogger, mockDb)

      const queryCall = mockClient.query.mock.calls[0]

      expect(queryCall).toHaveLength(1)
    })

    it('should use JOIN to combine actions and actions_config tables', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      await getEnabledActions(mockLogger, mockDb)

      const queryCall = mockClient.query.mock.calls[0]
      const sqlQuery = queryCall[0]

      expect(sqlQuery).toContain('JOIN actions_config ac ON a.code = ac.code')
    })

    it('should filter for enabled actions only', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      await getEnabledActions(mockLogger, mockDb)

      const queryCall = mockClient.query.mock.calls[0]
      const sqlQuery = queryCall[0]

      expect(sqlQuery).toContain('a.enabled = TRUE')
      expect(sqlQuery).toContain('ac.is_active = TRUE')
    })
  })

  describe('return value handling', () => {
    it('should return array of transformed actions', async () => {
      const mockDbActions = [
        { code: 'CMOR1', name: 'Action 1' },
        { code: 'SPM4', name: 'Action 2' }
      ]

      mockClient.query.mockResolvedValue({ rows: mockDbActions })

      const result = await getEnabledActions(mockLogger, mockDb)

      expect(result).toBeInstanceOf(Array)
      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('transformed', true)
      expect(result[1]).toHaveProperty('transformed', true)
    })

    it('should return empty array when result is empty', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      const result = await getEnabledActions(mockLogger, mockDb)

      expect(result).toEqual([])
      expect(result).toHaveLength(0)
    })

    it('should return empty array on error', async () => {
      mockDb.connect.mockRejectedValue(new Error('Connection failed'))

      const result = await getEnabledActions(mockLogger, mockDb)

      expect(result).toEqual([])
    })

    it('should preserve transformation for all items', async () => {
      const mockDbActions = [
        { code: 'ACTION1' },
        { code: 'ACTION2' },
        { code: 'ACTION3' }
      ]

      actionConfigTransformer.mockImplementation((action) => ({
        ...action,
        code: action.code.toLowerCase()
      }))

      mockClient.query.mockResolvedValue({ rows: mockDbActions })

      const result = await getEnabledActions(mockLogger, mockDb)

      expect(result).toHaveLength(3)
      expect(result[0].code).toBe('action1')
      expect(result[1].code).toBe('action2')
      expect(result[2].code).toBe('action3')
    })
  })

  describe('database connection management', () => {
    it('should connect to database and execute query', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      await getEnabledActions(mockLogger, mockDb)

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
      expect(mockClient.query).toHaveBeenCalledTimes(1)
    })

    it('should release client after successful query', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      await getEnabledActions(mockLogger, mockDb)

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })

    it('should only connect once per call', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      await getEnabledActions(mockLogger, mockDb)

      expect(mockDb.connect).toHaveBeenCalledTimes(1)
    })

    it('should only release once per call', async () => {
      mockClient.query.mockResolvedValue({ rows: [] })

      await getEnabledActions(mockLogger, mockDb)

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })
  })

  describe('data structure handling', () => {
    it('should handle actions with all fields populated', async () => {
      const mockDbAction = [
        {
          code: 'CMOR1',
          name: 'Create or restore wetland',
          description: 'Full description',
          enabled: true,
          version: 2,
          start_date: '2024-01-01',
          application_unit_of_measurement: 'hectares',
          duration_years: 5,
          payment: { rate: 100, currency: 'GBP' },
          land_cover_class_codes: ['LC001', 'LC002', 'LC003'],
          rules: {
            eligibility: { minArea: 0.5 },
            validation: { maxArea: 100 }
          },
          last_updated: new Date('2024-01-01T00:00:00Z')
        }
      ]

      mockClient.query.mockResolvedValue({ rows: mockDbAction })

      const result = await getEnabledActions(mockLogger, mockDb)

      expect(actionConfigTransformer).toHaveBeenCalledWith(
        mockDbAction[0],
        0,
        mockDbAction
      )
      expect(result).toHaveLength(1)
    })

    it('should handle actions with minimal fields', async () => {
      const mockDbAction = [
        {
          code: 'MINIMAL',
          enabled: true
        }
      ]

      mockClient.query.mockResolvedValue({ rows: mockDbAction })

      const result = await getEnabledActions(mockLogger, mockDb)

      expect(actionConfigTransformer).toHaveBeenCalledWith(
        mockDbAction[0],
        0,
        mockDbAction
      )
      expect(result).toHaveLength(1)
    })

    it('should handle actions with null values', async () => {
      const mockDbAction = [
        {
          code: 'CMOR1',
          name: null,
          description: null,
          enabled: true,
          payment: null,
          land_cover_class_codes: null,
          rules: null
        }
      ]

      mockClient.query.mockResolvedValue({ rows: mockDbAction })

      const result = await getEnabledActions(mockLogger, mockDb)

      expect(actionConfigTransformer).toHaveBeenCalledWith(
        mockDbAction[0],
        0,
        mockDbAction
      )
      expect(result).toHaveLength(1)
    })
  })
})
