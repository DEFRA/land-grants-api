import { statistics } from './statistics.js'
import { vi } from 'vitest'
import { config } from '~/src/config/index.js'

const { mockSchedule, mockGetStats, mockMetricsCounter, mockWithTaskLock } =
  vi.hoisted(() => ({
    mockSchedule: vi.fn(),
    mockGetStats: vi.fn(),
    mockMetricsCounter: vi.fn(),
    mockWithTaskLock: vi.fn((pool, taskName, fn) =>
      fn().then((r) => ({ acquired: true, result: r }))
    )
  }))

vi.mock('node-cron', () => ({
  schedule: mockSchedule
}))

vi.mock('~/src/features/statistics/queries/stats.query.js', () => ({
  getStats: mockGetStats
}))

vi.mock('~/src/features/common/helpers/metrics.js', () => ({
  metricsCounter: mockMetricsCounter
}))

vi.mock('~/src/features/common/helpers/task-lock.js', () => ({
  withTaskLock: mockWithTaskLock
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
    mockGetStats.mockResolvedValue({})

    config.set('cron.statsSchedule', '0 7 * * *')
    config.set('cron.timezone', 'UTC')
    config.set('cron.maxRandomDelay', 150)
    config.set('cron.taskLockTimeoutMinutes', 5)
  })

  test('Should have the correct plugin name', () => {
    expect(statistics.plugin.name).toBe('statistics')
  })

  test('Should have the correct plugin version', () => {
    expect(statistics.plugin.version).toBe('1.0.0')
  })

  test('Should get stats on startup', async () => {
    statistics.plugin.register(mockServer)

    await vi.waitFor(() => {
      expect(mockGetStats).toHaveBeenCalledWith(mockLogger, mockPostgresDb)
    })
  })

  test('Should log error when initial load fails', async () => {
    // make the initial getStats call reject
    mockGetStats.mockRejectedValueOnce(new Error('startup-failure'))

    statistics.plugin.register(mockServer)

    await vi.waitFor(() => {
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.any(Error) }),
        'Failed to get stats on startup'
      )
    })
  })

  test('Should schedule cron job with correct pattern', () => {
    statistics.plugin.register(mockServer)

    expect(mockSchedule).toHaveBeenCalledTimes(1)
    expect(mockSchedule).toHaveBeenCalledWith(
      '0 7 * * *',
      expect.any(Function),
      {
        timezone: 'UTC',
        maxRandomDelay: 150
      }
    )
  })

  test('Should get stats when cron runs', async () => {
    statistics.plugin.register(mockServer)

    const cronCallback = mockSchedule.mock.calls[0][1]
    mockGetStats.mockResolvedValue({
      actionsCount: 10
    })

    await cronCallback()

    expect(mockGetStats).toHaveBeenCalledWith(mockLogger, mockPostgresDb)
  })

  test('Should log info when cron job starts and completes successfully', async () => {
    statistics.plugin.register(mockServer)

    const cronCallback = mockSchedule.mock.calls[0][1]
    mockGetStats.mockResolvedValue({})

    await cronCallback()

    expect(mockLogger.info).toHaveBeenCalledWith('Running statistics cron job')
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Statistics cron job completed successfully'
    )
  })

  test('should log stats with all counts', async () => {
    statistics.plugin.register(mockServer)

    const cronCallback = mockSchedule.mock.calls[0][1]

    await vi.waitFor(() => {
      expect(mockGetStats).toHaveBeenCalled()
    })

    mockLogger.info.mockClear()
    mockGetStats.mockClear()
    mockGetStats.mockResolvedValue({
      actionsCount: 10,
      unlinkedParcelsCount: 3,
      unlinkedCoversCount: 1
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

  test('Should emit unlinked_parcels_count and unlinked_covers_count metrics', async () => {
    statistics.plugin.register(mockServer)

    const cronCallback = mockSchedule.mock.calls[0][1]
    mockGetStats.mockResolvedValue({
      unlinkedParcelsCount: 5,
      unlinkedCoversCount: 3
    })

    await cronCallback()

    expect(mockMetricsCounter).toHaveBeenCalledWith('unlinked_parcels_count', 5)
    expect(mockMetricsCounter).toHaveBeenCalledWith('unlinked_covers_count', 3)
  })
})
