import { getStats } from './stats.query.js'

describe('getStats', () => {
  let mockDb
  let mockLogger
  let mockClient

  beforeEach(() => {
    const createMockResult = (count) => ({
      rows: [{ count: String(count) }]
    })

    mockClient = {
      query: vi
        .fn()
        .mockResolvedValueOnce(createMockResult(10)) // actions
        .mockResolvedValueOnce(createMockResult(15)) // actions_config
        .mockResolvedValueOnce(createMockResult(5)) // agreements
        .mockResolvedValueOnce(createMockResult(20)) // application_results
        .mockResolvedValueOnce(createMockResult(100)) // compatibility_matrix
        .mockResolvedValueOnce(createMockResult(25)) // land_cover_codes
        .mockResolvedValueOnce(createMockResult(50)) // land_cover_codes_actions
        .mockResolvedValueOnce(createMockResult(1000)) // land_covers
        .mockResolvedValueOnce(createMockResult(500)) // land_parcels
        .mockResolvedValueOnce(createMockResult(70)) // sssi
        .mockResolvedValueOnce(createMockResult(30)), // moorland_designations
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

  test('should connect to the database', async () => {
    await getStats(mockLogger, mockDb)

    expect(mockDb.connect).toHaveBeenCalledTimes(1)
  })

  test('should query all tables for counts', async () => {
    await getStats(mockLogger, mockDb)

    expect(mockClient.query).toHaveBeenCalledTimes(11)
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) FROM actions'
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) FROM actions_config'
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) FROM agreements'
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) FROM application_results'
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) FROM compatibility_matrix'
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) FROM land_cover_codes'
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) FROM land_cover_codes_actions'
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) FROM land_covers'
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) FROM land_parcels'
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) FROM data_layer WHERE data_layer_type_id = 1'
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) FROM data_layer WHERE data_layer_type_id = 2'
    )
  })

  test('should log stats with all counts', async () => {
    await getStats(mockLogger, mockDb)

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          category: 'database',
          type: 'info'
        })
      }),
      expect.stringContaining('Get stats')
    )

    const logMessage = mockLogger.info.mock.calls[0][1]
    expect(logMessage).toContain('actionsCount=10')
    expect(logMessage).toContain('actionsConfigCount=15')
    expect(logMessage).toContain('agreementsCount=5')
    expect(logMessage).toContain('applicationResultsCount=20')
    expect(logMessage).toContain('compatibilityMatrixCount=100')
    expect(logMessage).toContain('landCoverCodesCount=25')
    expect(logMessage).toContain('landCoverCodesActionsCount=50')
    expect(logMessage).toContain('landCoversCount=1000')
    expect(logMessage).toContain('landParcelsCount=500')
    expect(logMessage).toContain('sssiCount=70')
    expect(logMessage).toContain('moorlandDesignationsCount=30')
  })

  test('should release the client when done', async () => {
    await getStats(mockLogger, mockDb)

    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should handle errors and log them', async () => {
    const error = new Error('Database error')
    mockClient.query = vi.fn().mockRejectedValue(error)

    await getStats(mockLogger, mockDb)

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Database error'
        }),
        event: expect.objectContaining({
          category: 'database',
          action: 'Get stats failed',
          type: 'error'
        })
      }),
      expect.stringContaining('Database operation failed: Get stats failed')
    )

    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should handle database connection error', async () => {
    const connectionError = new Error('Connection failed')
    mockDb.connect = vi.fn().mockRejectedValue(connectionError)

    await getStats(mockLogger, mockDb)

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Connection failed'
        }),
        event: expect.objectContaining({
          category: 'database',
          action: 'Get stats failed',
          type: 'error'
        })
      }),
      expect.stringContaining('Database operation failed: Get stats failed')
    )

    expect(mockClient.release).not.toHaveBeenCalled()
  })

  test('should handle client release if client is not defined', async () => {
    mockDb.connect = vi.fn().mockRejectedValue(new Error('Connection error'))

    await getStats(mockLogger, mockDb)

    expect(mockLogger.error).toHaveBeenCalled()
    expect(mockClient.release).not.toHaveBeenCalled()
  })
})
