import { getStats } from './stats.query.js'

describe('getStats', () => {
  let mockDb
  let mockLogger

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

    mockDb = {
      query: vi
        .fn()
        .mockResolvedValueOnce({ rows: [row] })
        .mockResolvedValueOnce({ rows: [{ count: 450 }] }) // uniqueParcels
        .mockResolvedValueOnce({ rows: [{ count: 900 }] }) // uniqueCovers
        .mockResolvedValueOnce({ rows: [{ count: 15 }] }) // duplicateCovers
        .mockResolvedValueOnce({ rows: [{ count: 3 }] }) // unlinkedParcels
        .mockResolvedValueOnce({ rows: [{ count: 1 }] }) // unlinkedCovers
    }

    mockLogger = {
      info: vi.fn(),
      error: vi.fn()
    }
  })

  test('should query the database', async () => {
    await getStats(mockLogger, mockDb)

    expect(mockDb.query).toHaveBeenCalled()
  })

  test('should query the database for quick + heavy counts', async () => {
    await getStats(mockLogger, mockDb)

    expect(mockDb.query).toHaveBeenCalledTimes(6)
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

    // nothing to release when using the pool
    expect(mockDb.query).toHaveBeenCalledTimes(6)
  })

  test('should handle errors and log them', async () => {
    const error = new Error('Database error')
    mockDb.query = vi.fn().mockRejectedValue(error)

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

  test('should return zeros when queries return no rows', async () => {
    mockDb.query = vi.fn().mockResolvedValue({ rows: [] })

    const stats = await getStats(mockLogger, mockDb)

    expect(stats).toEqual({
      uniqueParcelsCount: 0,
      uniqueCoversCount: 0,
      duplicateCoversCount: 0,
      unlinkedParcelsCount: 0,
      unlinkedCoversCount: 0
    })
  })

  test('should handle database connection error', async () => {
    const connectionError = new Error('Connection failed')
    mockDb.query = vi.fn().mockRejectedValue(connectionError)

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
    mockDb.query = vi.fn().mockRejectedValue(new Error('Connection error'))

    await getStats(mockLogger, mockDb)

    expect(mockLogger.error).toHaveBeenCalled()
  })
})
