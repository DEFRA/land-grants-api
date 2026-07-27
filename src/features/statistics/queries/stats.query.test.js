import { getStats } from './stats.query.js'

describe('getStats', () => {
  let mockDb
  let mockLogger
  let mockClient

  beforeEach(() => {
    const createMockResult = (key, count) => ({
      rows: [{ [key]: String(count) }]
    })

    mockClient = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ command: 'SET' }) // SET max_parallel_workers_per_gather
        .mockResolvedValueOnce(createMockResult('actionsCount', 10))
        .mockResolvedValueOnce(createMockResult('actionsConfigCount', 15))
        .mockResolvedValueOnce(createMockResult('agreementsCount', 5))
        .mockResolvedValueOnce(createMockResult('applicationResultsCount', 20))
        .mockResolvedValueOnce(
          createMockResult('compatibilityMatrixCount', 100)
        )
        .mockResolvedValueOnce(createMockResult('landCoverCodesCount', 25))
        .mockResolvedValueOnce(
          createMockResult('landCoverCodesActionsCount', 50)
        )
        .mockResolvedValueOnce(createMockResult('landCoversCount', 1000))
        .mockResolvedValueOnce(createMockResult('landParcelsCount', 500))
        .mockResolvedValueOnce(createMockResult('sssiCount', 70))
        .mockResolvedValueOnce(
          createMockResult('moorlandDesignationsCount', 30)
        )
        .mockResolvedValueOnce(
          createMockResult('registeredParksGardensCount', 40)
        )
        .mockResolvedValueOnce(
          createMockResult('registeredBattlefieldsCount', 60)
        )
        .mockResolvedValueOnce(createMockResult('scheduledMonumentsCount', 80))
        .mockResolvedValueOnce(createMockResult('shineCount', 90))
        .mockResolvedValueOnce(createMockResult('uniqueParcelsCount', 450))
        .mockResolvedValueOnce(createMockResult('uniqueCoversCount', 900))
        .mockResolvedValueOnce(createMockResult('duplicateCoversCount', 15))
        .mockResolvedValueOnce(createMockResult('unlinkedParcelsCount', 3))
        .mockResolvedValueOnce(createMockResult('unlinkedCoversCount', 1))
        .mockResolvedValueOnce({ command: 'SET' }), // reset max_parallel_workers_per_gather
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

    expect(mockClient.query).toHaveBeenCalledTimes(22)
  })

  test('should log stats with all counts', async () => {
    const stats = await getStats(mockLogger, mockDb)

    expect(stats).toEqual({
      actionsCount: '10',
      actionsConfigCount: '15',
      agreementsCount: '5',
      applicationResultsCount: '20',
      compatibilityMatrixCount: '100',
      landCoverCodesCount: '25',
      landCoverCodesActionsCount: '50',
      landCoversCount: '1000',
      landParcelsCount: '500',
      sssiCount: '70',
      moorlandDesignationsCount: '30',
      registeredParksGardensCount: '40',
      registeredBattlefieldsCount: '60',
      scheduledMonumentsCount: '80',
      shineCount: '90',
      uniqueParcelsCount: '450',
      uniqueCoversCount: '900',
      duplicateCoversCount: '15',
      unlinkedParcelsCount: '3',
      unlinkedCoversCount: '1'
    })
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
