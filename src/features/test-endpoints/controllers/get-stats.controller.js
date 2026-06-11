import Boom from '@hapi/boom'
import { logBusinessError } from '~/src/features/common/helpers/logging/log-helpers.js'
import { statusCodes } from '~/src/features/common/constants/status-codes.js'
import { getStats } from '~/src/features/statistics/queries/stats.query.js'

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
      return (
        res
          // @ts-expect-error - postgresDb
          .response(await getStats(request.logger, request.server.postgresDb))
          .code(statusCodes.ok)
      )
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
