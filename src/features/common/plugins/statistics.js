import { schedule } from 'node-cron'
import { config } from '../../../config/index.js'
import { logInfo } from '../../common/helpers/logging/log-helpers.js'
import { getStats } from '../../statistics/queries/stats.query.js'
import { metricsCounter } from '../helpers/metrics.js'
import { withTaskLock } from '../helpers/task-lock.js'

export const statistics = {
  plugin: {
    name: 'statistics',
    version: '1.0.0',
    register(server) {
      const loadStats = async () => {
        try {
          const lockTimeout = config.get('cron.taskLockTimeoutMinutes')

          const runStatsTask = async () => {
            server.logger.info('Running statistics cron job')
            const stats = await getStats(server.logger, server.postgresDb)

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

            server.logger.info('Statistics cron job completed successfully')
          }

          const { acquired } = await withTaskLock(
            server.postgresDb,
            'loadStats',
            runStatsTask,
            { timeoutMinutes: lockTimeout }
          )

          if (!acquired) {
            server.logger.info('Skipping statistics run; lock not acquired')
          }
        } catch (err) {
          server.logger.error({ err }, 'Error running statistics cron job')
          throw err
        }
      }

      schedule(config.get('cron.statsSchedule'), loadStats, {
        timezone: config.get('cron.timezone'),
        maxRandomDelay: config.get('cron.maxRandomDelay')
      })

      loadStats().catch((error) => {
        server.logger.error({ error }, 'Failed to get stats on startup')
      })
    }
  }
}
