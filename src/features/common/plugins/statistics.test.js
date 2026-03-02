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

  test('Should log error when getStats fails', async () => {
    statistics.plugin.register(mockServer)

    const cronCallback = mockSchedule.mock.calls[0][1]
    mockGetStats.mockRejectedValue(new Error('Database error'))

    await cronCallback()

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to connect to Postgres'
    )
  })
})
