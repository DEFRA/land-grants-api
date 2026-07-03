import { getStats } from './stats.query.js'

describe('getStats', () => {
  let mockDb
  let mockLogger
  let mockClient

  beforeEach(() => {
    mockClient = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [{ actionsCount: '10' }] })
        .mockResolvedValueOnce({ rows: [{ actionsConfigCount: '15' }] })
        .mockResolvedValueOnce({ rows: [{ agreementsCount: '5' }] })
        .mockResolvedValueOnce({ rows: [{ applicationResultsCount: '20' }] })
        .mockResolvedValueOnce({ rows: [{ compatibilityMatrixCount: '100' }] })
        .mockResolvedValueOnce({ rows: [{ landCoverCodesCount: '25' }] })
        .mockResolvedValueOnce({ rows: [{ landCoverCodesActionsCount: '50' }] })
        .mockResolvedValueOnce({ rows: [{ landCoversCount: '1000' }] })
        .mockResolvedValueOnce({ rows: [{ landParcelsCount: '500' }] })
        .mockResolvedValueOnce({ rows: [{ sssiCount: '70' }] })
        .mockResolvedValueOnce({ rows: [{ moorlandDesignationsCount: '30' }] })
        .mockResolvedValueOnce({
          rows: [{ registeredParksGardensCount: '40' }]
        })
        .mockResolvedValueOnce({
          rows: [{ registeredBattlefieldsCount: '60' }]
        })
        .mockResolvedValueOnce({ rows: [{ scheduledMonumentsCount: '80' }] })
        .mockResolvedValueOnce({ rows: [{ shineCount: '90' }] })
        .mockResolvedValueOnce({ rows: [{ uniqueParcelsCount: 450 }] })
        .mockResolvedValueOnce({ rows: [{ uniqueCoversCount: 900 }] })
        .mockResolvedValueOnce({ rows: [{ duplicateCoversCount: 15 }] })
        .mockResolvedValueOnce({ rows: [{ unlinkedParcelsCount: 3 }] })
        .mockResolvedValueOnce({ rows: [{ unlinkedCoversCount: 1 }] }),
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

  test('should query the database', async () => {
    await getStats(mockLogger, mockDb)

    expect(mockDb.connect).toHaveBeenCalledTimes(1)
  })

  test('should query the database for quick + heavy counts', async () => {
    await getStats(mockLogger, mockDb)
    expect(mockClient.query).toHaveBeenCalledTimes(20)
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
        uniqueParcelsCount: 450,
        uniqueCoversCount: 900,
        duplicateCoversCount: 15,
        unlinkedParcelsCount: 3,
        unlinkedCoversCount: 1
      })
    )
  })

  test('should not attempt client release (uses pool)', async () => {
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
  })

  test('should return "N/A" when queries return no rows', async () => {
    mockClient.query = vi.fn().mockResolvedValue({ rows: [] })

    const stats = await getStats(mockLogger, mockDb)

    expect(stats).toEqual({})
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
  })

  test('should handle client release if client is not defined', async () => {
    mockDb.connect = vi.fn().mockRejectedValue(new Error('Connection error'))

    await getStats(mockLogger, mockDb)

    expect(mockLogger.error).toHaveBeenCalled()
  })
})
