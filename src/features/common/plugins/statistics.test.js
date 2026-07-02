import { statistics } from '~/src/features/common/plugins/statistics.js'
import { vi } from 'vitest'

const {
  mockSchedule,
  mockInitStatsCache,
  mockStopStatsCache,
  mockRefreshCachedStats,
  mockMetricsCounter
} = vi.hoisted(() => ({
  mockSchedule: vi.fn(),
  mockInitStatsCache: vi.fn(),
  mockStopStatsCache: vi.fn(),
  mockRefreshCachedStats: vi.fn(),
  mockMetricsCounter: vi.fn()
}))

vi.mock('node-cron', () => ({
  schedule: mockSchedule
}))

vi.mock('~/src/features/statistics/stats-cache.js', () => ({
  initStatsCache: mockInitStatsCache,
  stopStatsCache: mockStopStatsCache,
  refreshCachedStats: mockRefreshCachedStats
}))

vi.mock('~/src/features/common/helpers/metrics.js', () => ({
  metricsCounter: mockMetricsCounter
}))

describe('#statistics', () => {
  let mockServer
  let mockLogger
  let mockPostgresDb

  beforeEach(() => {
    vi.clearAllMocks()
    mockLogger = {
      info: vi.fn(),
      error: vi.fn()
    }
    mockPostgresDb = {}
    mockServer = {
      logger: mockLogger,
      postgresDb: mockPostgresDb,
      events: {
        on: vi.fn()
      }
    }
    mockInitStatsCache.mockResolvedValue(undefined)
    mockRefreshCachedStats.mockResolvedValue(undefined)
  })

  test('Should have the correct plugin name', () => {
    expect(statistics.plugin.name).toBe('statistics')
  })

  test('Should have the correct plugin version', () => {
    expect(statistics.plugin.version).toBe('1.0.0')
  })

  test('Should initialise stats cache on register', async () => {
    await statistics.plugin.register(mockServer)

    expect(mockInitStatsCache).toHaveBeenCalledTimes(1)
  })

  test('Should schedule cron job with correct pattern', async () => {
    await statistics.plugin.register(mockServer)

    expect(mockSchedule).toHaveBeenCalledTimes(1)
    expect(mockSchedule).toHaveBeenCalledWith(
      '0 7 * * *',
      expect.any(Function),
      {
        timezone: 'UTC'
      }
    )
  })

  test('Should refresh cached stats when cron runs', async () => {
    await statistics.plugin.register(mockServer)

    const cronCallback = mockSchedule.mock.calls[0][1]
    mockRefreshCachedStats.mockResolvedValue({
      actionsCount: 10,
      lastUpdated: '2026-06-16T12:00:00.000Z'
    })

    await cronCallback()

    expect(mockRefreshCachedStats).toHaveBeenCalledWith(
      mockLogger,
      mockPostgresDb
    )
  })

  test('Should log info when cron job starts and completes successfully', async () => {
    await statistics.plugin.register(mockServer)

    const cronCallback = mockSchedule.mock.calls[0][1]
    mockRefreshCachedStats.mockResolvedValue(undefined)

    await cronCallback()

    expect(mockLogger.info).toHaveBeenCalledWith('Running statistics cron job')
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Statistics cron job completed successfully'
    )
  })

  test('should log stats with all counts', async () => {
    await statistics.plugin.register(mockServer)

    const cronCallback = mockSchedule.mock.calls[0][1]

    await vi.waitFor(() => {
      expect(mockRefreshCachedStats).toHaveBeenCalled()
    })

    mockLogger.info.mockClear()
    mockRefreshCachedStats.mockClear()
    mockRefreshCachedStats.mockResolvedValue({
      actionsCount: 10,
      unlinkedParcelsCount: 3,
      unlinkedCoversCount: 1,
      lastUpdated: '2026-06-16T12:00:00.000Z'
    })

    await cronCallback()

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          category: 'database',
          type: 'info'
        })
      }),
      expect.stringContaining('Get stats')
    )

    const logMessage = mockLogger.info.mock.calls.find(
      ([, message]) =>
        typeof message === 'string' && message.includes('Get stats')
    )?.[1]

    expect(logMessage).toContain('actionsCount=10')
    expect(logMessage).toContain('unlinkedParcelsCount=3')
    expect(logMessage).toContain('unlinkedCoversCount=1')
  })

  test('Should refresh cached stats on startup', async () => {
    await statistics.plugin.register(mockServer)

    await vi.waitFor(() => {
      expect(mockRefreshCachedStats).toHaveBeenCalledWith(
        mockLogger,
        mockPostgresDb
      )
    })
  })

  test('Should stop stats cache when server stops', async () => {
    await statistics.plugin.register(mockServer)

    const stopHandler = mockServer.events.on.mock.calls.find(
      ([event]) => event === 'stop'
    )?.[1]

    stopHandler()

    expect(mockStopStatsCache).toHaveBeenCalledTimes(1)
  })

  test('Should emit unlinked_parcels_count and unlinked_covers_count metrics when stats are available', async () => {
    await statistics.plugin.register(mockServer)

    const cronCallback = mockSchedule.mock.calls[0][1]
    mockRefreshCachedStats.mockResolvedValue({
      unlinkedParcelsCount: 5,
      unlinkedCoversCount: 3
    })

    await cronCallback()

    expect(mockMetricsCounter).toHaveBeenCalledWith('unlinked_parcels_count', 5)
    expect(mockMetricsCounter).toHaveBeenCalledWith('unlinked_covers_count', 3)
  })

  test('Should not emit orphan metrics when stats refresh returns undefined', async () => {
    await statistics.plugin.register(mockServer)

    const cronCallback = mockSchedule.mock.calls[0][1]
    mockRefreshCachedStats.mockResolvedValue(undefined)

    await cronCallback()

    expect(mockMetricsCounter).not.toHaveBeenCalled()
  })
})
