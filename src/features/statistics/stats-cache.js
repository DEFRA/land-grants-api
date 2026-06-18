import { createMemoryCache } from '~/src/features/common/helpers/memory-cache.js'
import { getStats } from './queries/stats.query.js'

const ONE_HOUR_MS = 60 * 60 * 1000

const statsCache = createMemoryCache({
  partition: 'statistics',
  segment: 'stats',
  id: 'stats',
  ttlMs: ONE_HOUR_MS
})

const initStatsCache = () => statsCache.start()
const stopStatsCache = () => statsCache.stop()
const getCachedStats = () => statsCache.get()
const setCachedStats = (stats) => statsCache.set(stats)
const refreshCachedStats = (logger, db) =>
  statsCache.refresh(async () => getStats(logger, db))

export {
  statsCache,
  initStatsCache,
  stopStatsCache,
  setCachedStats,
  getCachedStats,
  refreshCachedStats
}

/**
 * @import { Logger } from '~/src/features/common/logger.d.js'
 * @import { Pool } from '~/src/features/common/postgres.d.js'
 */
