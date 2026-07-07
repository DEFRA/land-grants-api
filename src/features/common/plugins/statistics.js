import { schedule } from 'node-cron'
import { config } from '~/src/config/index.js'
import { logInfo } from '../../common/helpers/logging/log-helpers.js'
import {
  initStatsCache,
  stopStatsCache,
  refreshCachedStats
} from '~/src/features/statistics/stats-cache.js'
import { metricsCounter } from '~/src/features/common/helpers/metrics.js'
import { withTaskLock } from '~/src/features/common/helpers/task-lock.js'

export const statistics = {
  plugin: {
    name: 'statistics',
    version: '1.0.0',
    async register(server) {
      await initStatsCache()

      const refreshStats = async () => {
        try {
          const lockTimeout = config.get('cron.taskLockTimeoutMinutes')

          const runStatsTask = async () => {
            server.logger.info('Running statistics cron job')
            const stats = await refreshCachedStats(
              server.logger,
              server.postgresDb
            )

            if (stats) {
              logInfo(server.logger, {
                category: 'database',
                message: 'Get stats',
                context: stats
              })
              const { unlinkedParcelsCount, unlinkedCoversCount } =
                /** @type {{ unlinkedParcelsCount: string | number, unlinkedCoversCount: string | number }} */ (
                  stats
                )
              await Promise.all([
                metricsCounter(
                  'unlinked_parcels_count',
                  Number(unlinkedParcelsCount)
                ),
                metricsCounter(
                  'unlinked_covers_count',
                  Number(unlinkedCoversCount)
                )
              ])
            }

            server.logger.info('Statistics cron job completed successfully')
          }

          if (!config.get('featureFlags.runTasksOnSingleInstance')) {
            await runStatsTask()
          } else {
            const { acquired } = await withTaskLock(
              server.postgresDb,
              'refreshStats',
              runStatsTask,
              { timeoutMinutes: lockTimeout }
            )

            if (!acquired) {
              server.logger.info('Skipping statistics run; lock not acquired')
            }
          }
        } catch (err) {
          server.logger.error({ err }, 'Error running statistics cron job')
        }
      }

      schedule(config.get('cron.statsSchedule'), refreshStats, {
        timezone: config.get('cron.timezone'),
        maxRandomDelay: config.get('cron.maxRandomDelay')
      })

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
