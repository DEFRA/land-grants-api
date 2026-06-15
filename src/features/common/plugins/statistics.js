import cron from 'node-cron'
import { getStats } from '~/src/features/statistics/queries/stats.query.js'
import { logInfo } from '../../common/helpers/logging/log-helpers.js'

export const statistics = {
  plugin: {
    name: 'statistics',
    version: '1.0.0',
    register(server) {
      cron.schedule('*/30 * * * *', async () => {
        server.logger.info('Running statistics cron job')
        const stats = await getStats(server.logger, server.postgresDb)

        logInfo(server.logger, {
          category: 'database',
          message: 'Get stats',
          context: stats
        })

        server.logger.info('Statistics cron job completed successfully')
      })
    }
  }
}
