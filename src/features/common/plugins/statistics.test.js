import { statistics } from '~/src/features/common/plugins/statistics.js'
import { vi } from 'vitest'

const { mockSchedule, mockGetStats } = vi.hoisted(() => ({
  mockSchedule: vi.fn(),
  mockGetStats: vi.fn()
}))

vi.mock('node-cron', () => ({
  default: {
    schedule: mockSchedule
  }
}))

vi.mock('~/src/features/statistics/queries/stats.query.js', () => ({
  getStats: mockGetStats
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
      postgresDb: mockPostgresDb
    }
  })

  test('Should have the correct plugin name', () => {
    expect(statistics.plugin.name).toBe('statistics')
  })

  test('Should have the correct plugin version', () => {
    expect(statistics.plugin.version).toBe('1.0.0')
  })

  test('Should schedule cron job with correct pattern', () => {
    statistics.plugin.register(mockServer)

    expect(mockSchedule).toHaveBeenCalledTimes(1)
    expect(mockSchedule).toHaveBeenCalledWith(
      '*/30 * * * *',
      expect.any(Function)
    )
  })

  test('Should call getStats with logger and postgresDb when cron runs', async () => {
    statistics.plugin.register(mockServer)

    const cronCallback = mockSchedule.mock.calls[0][1]
    mockGetStats.mockResolvedValue(undefined)

    await cronCallback()

    expect(mockGetStats).toHaveBeenCalledWith(mockLogger, mockPostgresDb)
  })

  test('Should log info when cron job starts and completes successfully', async () => {
    statistics.plugin.register(mockServer)

    const cronCallback = mockSchedule.mock.calls[0][1]
    mockGetStats.mockResolvedValue(undefined)

    await cronCallback()

    expect(mockLogger.info).toHaveBeenCalledWith('Running statistics cron job')
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Statistics cron job completed successfully'
    )
  })

  test('should log stats with all counts', async () => {
    statistics.plugin.register(mockServer)

    const cronCallback = mockSchedule.mock.calls[0][1]
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

    const logMessage = mockLogger.info.mock.calls[1][1]

    expect(logMessage).toContain('actionsCount=10')
    expect(logMessage).toContain('unlinkedParcelsCount=3')
    expect(logMessage).toContain('unlinkedCoversCount=1')
  })
})
