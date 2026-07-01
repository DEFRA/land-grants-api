import { getStats } from './stats.query.js'

describe('getStats', () => {
  let mockDb
  let mockLogger
  let mockClient

  beforeEach(() => {
    const row = {
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
    }

    mockClient = {
      query: vi.fn().mockResolvedValue({ rows: [row] }),
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

    expect(mockClient.query).toHaveBeenCalledTimes(1)
    const calledSql = mockClient.query.mock.calls[0][0]
    expect(calledSql).toEqual(expect.stringContaining('"actionsCount"'))
    expect(calledSql).toEqual(expect.stringContaining('"uniqueParcelsCount"'))
    expect(calledSql).toEqual(expect.stringContaining('"duplicateCoversCount"'))
  })

  test('should log stats with all counts', async () => {
    const stats = await getStats(mockLogger, mockDb)

    expect(stats).toEqual(
      expect.objectContaining({
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
    )
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
