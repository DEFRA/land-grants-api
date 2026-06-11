import { vi } from 'vitest'
import Hapi from '@hapi/hapi'
import { config } from '~/src/config/index.js'
import { router } from '~/src/routes/router.js'
import { getStats } from '~/src/features/statistics/queries/stats.query.js'

vi.mock('~/src/config/index.js', () => ({
  config: {
    get: vi.fn()
  }
}))

vi.mock('~/src/features/statistics/queries/stats.query.js', () => ({
  getStats: vi.fn()
}))

const mockConfig = vi.mocked(config)
const mockGetStats = vi.mocked(getStats)

describe('test-endpoints', () => {
  const server = Hapi.server()

  const mockLogger = {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }

  const mockPostgresDb = {
    connect: vi.fn(),
    query: vi.fn()
  }

  const mockStats = {
    actionsCount: 100,
    unlinkedParcelsCount: 10,
    unlinkedCoversCount: 8
  }

  beforeAll(async () => {
    mockConfig.get.mockImplementation((key) => {
      if (key === 'featureFlags.testEndpoints') {
        return true
      }
      return undefined
    })

    server.decorate('request', 'logger', mockLogger)
    server.decorate('server', 'logger', mockLogger)
    server.decorate('server', 'postgresDb', mockPostgresDb)
    await server.register([router])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetStats.mockResolvedValue(mockStats)
  })

  describe('GET /test/stats route', () => {
    test('should return 200 with stats when testEndpoints feature flag is enabled', async () => {
      const request = {
        method: 'GET',
        url: '/test/stats'
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, result } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(result).toEqual(mockStats)
      expect(mockGetStats).toHaveBeenCalledWith(mockLogger, mockPostgresDb)
    })

    test('should return 500 when getStats fails', async () => {
      mockGetStats.mockRejectedValue(new Error('Database connection failed'))

      const request = {
        method: 'GET',
        url: '/test/stats'
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, result } = await server.inject(request)

      expect(statusCode).toBe(500)
      expect(result.message).toBe('An internal server error occurred')
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })
})
