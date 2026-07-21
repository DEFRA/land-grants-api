import { config } from '~/src/config/index.js'
import { logInfo } from '~/src/features/common/helpers/logging/log-helpers.js'
import { getStats } from '~/src/features/statistics/queries/stats.query.js'
import { metricsCounter } from '~/src/features/common/helpers/metrics.js'
import { withTaskLock } from '~/src/features/common/helpers/task-lock.js'

export const statistics = {
  plugin: {
    name: 'statistics',
    version: '1.0.0',
    register(server) {
      const loadAndLogStats = async () => {
        try {
          const lockTimeout = config.get('taskLockTimeoutMinutes')

          const runStatsTask = async () => {
            server.logger.info('Running statistics counts')
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

            server.logger.info('Statistics counts completed successfully')
          }

          const { acquired } = await withTaskLock(
            server.postgresDb,
            'loadAndLogStats',
            runStatsTask,
            { timeoutMinutes: lockTimeout }
          )

          if (!acquired) {
            server.logger.info('Skipping statistics run; lock not acquired')
          }
        } catch (err) {
          server.logger.error({ err }, 'Error running statistics counts')
          throw err
        }
      }
      server.expose('loadAndLogStats', loadAndLogStats)

      loadAndLogStats().catch((error) => {
        server.logger.error({ error }, 'Failed to get stats on startup')
      })
    }
  }
}
