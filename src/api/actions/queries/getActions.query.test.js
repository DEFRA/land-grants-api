import { getEnabledActions } from './getActions.query.js'

describe('getEnabledActions', () => {
  let mockDb
  let mockLogger
  let mockClient
  let mockResult
  let expectedTransformedResult

  beforeEach(() => {
    mockResult = {
      rows: [
        {
          code: 'UPL1',
          name: 'Upland Action 1',
          description: 'Test upland action',
          enabled: true,
          version: 1,
          start_date: '2024-01-01',
          application_unit_of_measurement: 'ha',
          duration_years: 5,
          payment: { amount: 100, unit: 'ha' },
          land_cover_class_codes: ['GRASS', 'ARABLE'],
          rules: { minArea: 0.5 },
          last_updated: '2024-01-15T10:00:00Z'
        },
        {
          code: 'CMOR1',
          name: 'Moorland Action 1',
          description: 'Test moorland action',
          enabled: true,
          version: 2,
          start_date: '2024-02-01',
          application_unit_of_measurement: 'ha',
          duration_years: 3,
          payment: { amount: 150, unit: 'ha' },
          land_cover_class_codes: ['MOORLAND'],
          rules: { minArea: 1.0 },
          last_updated: '2024-02-10T12:00:00Z'
        }
      ]
    }

    // Expected result after transformation
    expectedTransformedResult = [
      {
        code: 'UPL1',
        name: 'Upland Action 1',
        description: 'Test upland action',
        enabled: true,
        version: 1,
        applicationUnitOfMeasurement: 'ha',
        durationYears: 5,
        payment: { amount: 100, unit: 'ha' },
        landCoverClassCodes: ['GRASS', 'ARABLE'],
        rules: { minArea: 0.5 },
        startDate: '2024-01-01',
        lastUpdated: '2024-01-15T10:00:00Z'
      },
      {
        code: 'CMOR1',
        name: 'Moorland Action 1',
        description: 'Test moorland action',
        enabled: true,
        version: 2,
        applicationUnitOfMeasurement: 'ha',
        durationYears: 3,
        payment: { amount: 150, unit: 'ha' },
        landCoverClassCodes: ['MOORLAND'],
        rules: { minArea: 1.0 },
        startDate: '2024-02-01',
        lastUpdated: '2024-02-10T12:00:00Z'
      }
    ]

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

  test('should connect to the database', async () => {
    await getEnabledActions(mockLogger, mockDb)

    expect(mockDb.connect).toHaveBeenCalledTimes(1)
  })

  test('should query with the correct SQL', async () => {
    await getEnabledActions(mockLogger, mockDb)

    const expectedQuery = `
      SELECT
        a.*,
        ac.version,
        ac.config->>'start_date' as start_date,
        ac.config->>'application_unit_of_measurement' as application_unit_of_measurement,
        (ac.config->>'duration_years')::numeric as duration_years,
        ac.config->'payment' as payment,
        ac.config->'land_cover_class_codes' as land_cover_class_codes,
        ac.config->'rules' as rules,
        ac.last_updated_at as last_updated
      FROM actions a
      JOIN actions_config ac ON a.code = ac.code
      WHERE a.enabled = TRUE AND ac.is_active = TRUE
    `

    expect(mockClient.query).toHaveBeenCalledWith(expectedQuery)
  })

  test('should return the transformed query results', async () => {
    const result = await getEnabledActions(mockLogger, mockDb)

    expect(result).toEqual(expectedTransformedResult)
  })

  test('should return empty array when no enabled actions found', async () => {
    mockResult.rows = []

    const result = await getEnabledActions(mockLogger, mockDb)

    expect(result).toEqual([])
  })

  test('should release the client when done', async () => {
    await getEnabledActions(mockLogger, mockDb)

    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should handle errors and return empty array', async () => {
    const error = new Error('Database error')
    mockClient.query = jest.fn().mockRejectedValue(error)

    const result = await getEnabledActions(mockLogger, mockDb)

    expect(result).toEqual([])
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Database error'
        })
      }),
      expect.stringContaining('Database operation failed: Get enabled actions')
    )

    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should handle database connection error', async () => {
    const connectionError = new Error('Connection failed')
    mockDb.connect = jest.fn().mockRejectedValue(connectionError)

    const result = await getEnabledActions(mockLogger, mockDb)

    expect(result).toEqual([])

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Connection failed'
        })
      }),
      expect.stringContaining('Database operation failed: Get enabled actions')
    )

    expect(mockClient.release).not.toHaveBeenCalled()
  })

  test('should handle client release if client is not defined', async () => {
    mockDb.connect = jest.fn().mockRejectedValue(new Error('Connection error'))

    const result = await getEnabledActions(mockLogger, mockDb)

    expect(result).toEqual([])
    expect(mockLogger.error).toHaveBeenCalled()
    expect(mockClient.release).not.toHaveBeenCalled()
  })

  test('should correctly transform action configs with numeric duration_years', async () => {
    mockResult.rows = [
      {
        code: 'TEST1',
        name: 'Test Action',
        description: 'Test description',
        enabled: true,
        version: 1,
        start_date: '2024-01-01',
        application_unit_of_measurement: 'ha',
        duration_years: '10',
        payment: { amount: 200 },
        land_cover_class_codes: ['TEST'],
        rules: {},
        last_updated: '2024-01-01T00:00:00Z'
      }
    ]

    const result = await getEnabledActions(mockLogger, mockDb)

    expect(result[0].durationYears).toBe(10)
    expect(typeof result[0].durationYears).toBe('number')
  })

  test('should handle actions with different versions', async () => {
    mockResult.rows = [
      {
        code: 'ACT1',
        name: 'Action 1',
        description: 'Test',
        enabled: true,
        version: 99,
        start_date: '2024-01-01',
        application_unit_of_measurement: 'ha',
        duration_years: 5,
        payment: {},
        land_cover_class_codes: [],
        rules: {},
        last_updated: '2024-01-01T00:00:00Z'
      }
    ]

    const result = await getEnabledActions(mockLogger, mockDb)

    expect(result[0].version).toBe(99)
  })

  test('should handle null payment and rules', async () => {
    mockResult.rows = [
      {
        code: 'ACT1',
        name: 'Action 1',
        description: 'Test',
        enabled: true,
        version: 1,
        start_date: '2024-01-01',
        application_unit_of_measurement: 'ha',
        duration_years: 5,
        payment: null,
        land_cover_class_codes: null,
        rules: null,
        last_updated: '2024-01-01T00:00:00Z'
      }
    ]

    const result = await getEnabledActions(mockLogger, mockDb)

    expect(result[0].payment).toBeNull()
    expect(result[0].landCoverClassCodes).toBeNull()
    expect(result[0].rules).toBeNull()
  })
})
