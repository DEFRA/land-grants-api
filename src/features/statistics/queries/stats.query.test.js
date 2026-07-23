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
    expect(mockClient.query).toHaveBeenCalledWith(
      'SET max_parallel_workers_per_gather = 0'
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      'SET max_parallel_workers_per_gather = DEFAULT'
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) AS "actionsCount" FROM actions'
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) AS "actionsConfigCount" FROM actions_config'
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) AS "agreementsCount" FROM agreements'
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) AS "applicationResultsCount" FROM application_results'
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) AS "compatibilityMatrixCount" FROM compatibility_matrix'
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) AS "landCoverCodesCount" FROM land_cover_codes'
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) AS "landCoverCodesActionsCount" FROM land_cover_codes_actions'
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) AS "landCoversCount" FROM land_covers'
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) AS "landParcelsCount" FROM land_parcels'
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) AS "sssiCount" FROM data_layer WHERE data_layer_type_id = 1'
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT COUNT(*) AS "moorlandDesignationsCount" FROM data_layer WHERE data_layer_type_id = 2'
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      `SELECT COUNT(*) AS "registeredParksGardensCount" FROM data_layer WHERE data_layer_type_id = 3 and (metadata->>'type') = 'registered_parks_gardens'`
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      `SELECT COUNT(*) AS "registeredBattlefieldsCount" FROM data_layer WHERE data_layer_type_id = 3 and (metadata->>'type') = 'registered_battlefields'`
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      `SELECT COUNT(*) AS "scheduledMonumentsCount" FROM data_layer WHERE data_layer_type_id = 3 and (metadata->>'type') = 'scheduled_monuments'`
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      `SELECT COUNT(*) AS "shineCount" FROM data_layer WHERE data_layer_type_id = 3 and (metadata->>'type') = 'shine'`
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT COUNT(DISTINCT (sheet_id, parcel_id)) AS "uniqueParcelsCount" FROM land_parcels'
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT COUNT(DISTINCT (sheet_id, parcel_id)) AS "uniqueCoversCount" FROM land_covers'
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      `SELECT COUNT(*) AS "duplicateCoversCount" FROM (
      SELECT 1 FROM land_covers
      GROUP BY parcel_id, sheet_id, land_cover_class_code, geom_hash
      HAVING COUNT(*) > 1
    )`
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      `SELECT COUNT(*) AS "unlinkedParcelsCount"
      FROM land_parcels p
      LEFT JOIN land_covers c ON c.sheet_id = p.sheet_id AND c.parcel_id = p.parcel_id
      WHERE c.sheet_id IS NULL`
    )
    expect(mockClient.query).toHaveBeenCalledWith(
      `SELECT COUNT(*) AS "unlinkedCoversCount"
      FROM land_covers c
      LEFT JOIN land_parcels p ON c.sheet_id = p.sheet_id AND c.parcel_id = p.parcel_id
      WHERE p.sheet_id IS NULL`
    )
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
