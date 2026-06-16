import Boom from '@hapi/boom'
import { logBusinessError } from '~/src/features/common/helpers/logging/log-helpers.js'
import { statusCodes } from '~/src/features/common/constants/status-codes.js'
import { getCachedStats } from '~/src/features/statistics/stats-cache.js'

/**
 * getStatsController
 * Returns stats information about the land-grants-api
 * @satisfies {Partial<ServerRoute>}
 */
const getStatsController = {
  options: {
    description: 'Get stats information about the land-grants-api',
    tags: ['api', 'test'],
    auth: false
  },
  handler: async (request, res) => {
    try {
      const stats = await getCachedStats()

      if (!stats) {
        return Boom.serverUnavailable('Stats are not available yet')
      }

      return res.response(stats).code(statusCodes.ok)
    } catch (error) {
      const errorMessage = 'Fetching stats information'
      logBusinessError(request.logger, {
        operation: errorMessage,
        error
      })
      return Boom.internal(`Error ${errorMessage}`)
    }
  }
}

export { getStatsController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
