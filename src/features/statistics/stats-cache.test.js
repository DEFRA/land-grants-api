import { vi } from 'vitest'
import {
  statsCache,
  initStatsCache,
  stopStatsCache,
  setCachedStats,
  getCachedStats,
  refreshCachedStats
} from './stats-cache.js'
import { getStats } from './queries/stats.query.js'

vi.mock('./queries/stats.query.js', () => ({
  getStats: vi.fn()
}))

const mockGetStats = vi.mocked(getStats)

describe('stats-cache', () => {
  afterEach(async () => {
    await stopStatsCache()
    vi.clearAllMocks()
  })

  test('should use the expected cache configuration', () => {
    expect(statsCache.key).toEqual({ segment: 'stats', id: 'stats' })
    expect(statsCache.ttlMs).toBe(60 * 60 * 1000)
  })

  test('should store and retrieve stats with lastUpdated', async () => {
    await initStatsCache()

    const stats = {
      actionsCount: 10,
      unlinkedParcelsCount: 3,
      unlinkedCoversCount: 1
    }

    const cachedStats = await setCachedStats(stats)

    expect(cachedStats).toEqual(
      expect.objectContaining({
        ...stats,
        lastUpdated: expect.any(String)
      })
    )

    expect(await getCachedStats()).toEqual(cachedStats)
  })

  test('should return null when cache is empty', async () => {
    await initStatsCache()

    expect(await getCachedStats()).toBeNull()
  })

  test('should refresh cached stats from getStats', async () => {
    await initStatsCache()

    const stats = {
      actionsCount: 42,
      unlinkedParcelsCount: 5,
      unlinkedCoversCount: 2
    }

    mockGetStats.mockResolvedValue(stats)

    const mockLogger = {}
    const mockDb = {}

    const cachedStats = await refreshCachedStats(mockLogger, mockDb)

    expect(mockGetStats).toHaveBeenCalledWith(mockLogger, mockDb)
    expect(cachedStats).toEqual(
      expect.objectContaining({
        ...stats,
        lastUpdated: expect.any(String)
      })
    )
    expect(await getCachedStats()).toEqual(cachedStats)
  })

  test('should not cache when getStats returns undefined', async () => {
    await initStatsCache()

    mockGetStats.mockResolvedValue(undefined)

    const result = await refreshCachedStats({}, {})

    expect(result).toBeUndefined()
    expect(await getCachedStats()).toBeNull()
  })
})
