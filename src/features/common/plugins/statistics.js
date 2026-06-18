import cron from 'node-cron'
import { logInfo } from '../../common/helpers/logging/log-helpers.js'
import {
  initStatsCache,
  stopStatsCache,
  refreshCachedStats
} from '~/src/features/statistics/stats-cache.js'

export const statistics = {
  plugin: {
    name: 'statistics',
    version: '1.0.0',
    async register(server) {
      await initStatsCache()

      const refreshStats = async () => {
        server.logger.info('Running statistics cron job')
        const stats = await refreshCachedStats(server.logger, server.postgresDb)

        if (stats) {
          logInfo(server.logger, {
            category: 'database',
            message: 'Get stats',
            context: stats
          })
        }

        server.logger.info('Statistics cron job completed successfully')
      }

      cron.schedule('*/30 * * * *', refreshStats)

      refreshStats().catch((error) => {
        server.logger.error(
          { error },
          'Failed to refresh stats cache on startup'
        )
      })

      server.events.on('stop', async () => {
        await stopStatsCache()
      })
    }
  }
}
