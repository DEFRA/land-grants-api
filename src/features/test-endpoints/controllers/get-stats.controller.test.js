import { vi } from 'vitest'
import Hapi from '@hapi/hapi'
import { config } from '~/src/config/index.js'
import { router } from '~/src/routes/router.js'
import { getCachedStats } from '~/src/features/statistics/stats-cache.js'

vi.mock('~/src/config/index.js', () => ({
  config: {
    get: vi.fn()
  }
}))

vi.mock('~/src/features/statistics/stats-cache.js', () => ({
  getCachedStats: vi.fn()
}))

const mockConfig = vi.mocked(config)
const mockGetCachedStats = vi.mocked(getCachedStats)

describe('test-endpoints', () => {
  const server = Hapi.server()

  const mockLogger = {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }

  const mockStats = {
    actionsCount: 100,
    unlinkedParcelsCount: 10,
    unlinkedCoversCount: 8,
    lastUpdated: '2026-06-16T12:00:00.000Z'
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
    await server.register([router])
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCachedStats.mockResolvedValue(mockStats)
  })

  describe('GET /test/stats route', () => {
    test('should return 200 with cached stats when testEndpoints feature flag is enabled', async () => {
      const request = {
        method: 'GET',
        url: '/test/stats'
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, result } = await server.inject(request)

      expect(statusCode).toBe(200)
      expect(result).toEqual(mockStats)
      expect(mockGetCachedStats).toHaveBeenCalledTimes(1)
    })

    test('should return 503 when cached stats are not available', async () => {
      mockGetCachedStats.mockResolvedValue(null)

      const request = {
        method: 'GET',
        url: '/test/stats'
      }

      /** @type { Hapi.ServerInjectResponse<object> } */
      const { statusCode, result } = await server.inject(request)

      expect(statusCode).toBe(503)
      expect(result.message).toBe('Stats are not available yet')
    })

    test('should return 500 when getCachedStats fails', async () => {
      mockGetCachedStats.mockRejectedValue(new Error('Cache read failed'))

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
