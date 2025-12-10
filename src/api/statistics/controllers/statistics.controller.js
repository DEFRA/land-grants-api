import Boom from '@hapi/boom'
import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import {
  logBusinessError,
  logInfo
} from '~/src/api/common/helpers/logging/log-helpers.js'
import { internalServerErrorResponseSchema } from '~/src/api/common/schema/index.js'
import { getStats } from '../queries/stats.query.js'
import { statisticsSuccessResponseSchema } from './schema/statistics.schema.js'

export const StatisticsController = {
  options: {
    tags: ['api'],
    description: 'Get statistics',
    notes: 'Get statistics',
    response: {
      status: {
        200: statisticsSuccessResponseSchema,
        500: internalServerErrorResponseSchema
      }
    }
  },
  /**
   * Handler function for getting statistics
   * @param {import('@hapi/hapi').Request} request - Hapi request object
   * @param {import('@hapi/hapi').ResponseToolkit} h - Hapi response toolkit
   * @returns {Promise<import('@hapi/hapi').ResponseObject | import('@hapi/boom').Boom>} Validation response
   */
  handler: async (request, h) => {
    // @ts-expect-error - postgresDb
    const postgresDb = request.server.postgresDb
    const category = 'statistics'

    try {
      logInfo(request.logger, {
        category,
        operation: `${category}_start`,
        message: `Getting statistics`
      })

      await getStats(request.logger, postgresDb)

      return h
        .response({ message: 'Statistics retrieved' })
        .code(statusCodes.ok)
    } catch (error) {
      logBusinessError(request.logger, {
        operation: `${category}_error`,
        error
      })
      return Boom.internal('Error getting statistics')
    }
  }
}
