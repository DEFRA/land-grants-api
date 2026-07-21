import { statistics } from './statistics.js'
import { vi } from 'vitest'

const { mockGetStats, mockMetricsCounter, mockWithTaskLock } = vi.hoisted(
  () => ({
    mockGetStats: vi.fn(),
    mockMetricsCounter: vi.fn(),
    mockWithTaskLock: vi.fn((pool, taskName, fn) =>
      fn().then((r) => ({ acquired: true, result: r }))
    )
  })
)

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
      expose: vi.fn(),
      events: {
        on: vi.fn()
      }
    }
    mockGetStats.mockResolvedValue({})
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

  test('Should expose loadAndLogStats function', () => {
    statistics.plugin.register(mockServer)

    expect(mockServer.expose).toHaveBeenCalledWith(
      'loadAndLogStats',
      expect.any(Function)
    )
  })
})
