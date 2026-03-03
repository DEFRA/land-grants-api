import cron from 'node-cron'
import { getStats } from '~/src/features/statistics/queries/stats.query.js'

export const statistics = {
  plugin: {
    name: 'statistics',
    version: '1.0.0',
    register(server) {
      cron.schedule('*/30 * * * *', async () => {
        server.logger.info('Running statistics cron job')
        await getStats(server.logger, server.postgresDb)
        server.logger.info('Statistics cron job completed successfully')
      })
    }
  }
}
