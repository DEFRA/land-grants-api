import Boom from '@hapi/boom'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/api/common/schema/index.js'
import { getApplicationValidationRun } from '../queries/getApplicationValidationRun.query.js'
import {
  applicationValidationRunRequestSchema,
  applicationValidationRunResponseSchema
} from '../schema/application-validation.schema.js'
import { statusCodes } from '~/src/api/common/constants/status-codes.js'

export const ApplicationValidationRunController = {
  options: {
    tags: ['api'],
    description: 'Returns an application validation run',
    notes: 'Returns a validation run for a specific application',
    validate: {
      params: applicationValidationRunRequestSchema
    },
    response: {
      status: {
        200: applicationValidationRunResponseSchema,
        404: errorResponseSchema,
        500: internalServerErrorResponseSchema
      }
    }
  },
  /**
   * Handler function for application validation
   * @param {import('@hapi/hapi').Request} request - Hapi request object
   * @param {import('@hapi/hapi').ResponseToolkit} h - Hapi response toolkit
   * @returns {Promise<import('@hapi/hapi').ResponseObject | import('@hapi/boom').Boom>} Validation response
   */
  handler: async (request, h) => {
    try {
      // @ts-expect-error - postgresDb is added via server decoration
      const postgresDb = request.server.postgresDb
      const { id } = request.params
      const applicationValidationRun = await getApplicationValidationRun(
        request.logger,
        postgresDb,
        id
      )

      if (!applicationValidationRun) {
        return Boom.notFound('Application validation run not found')
      }

      return h
        .response({
          message: 'Application validation run retrieved successfully',
          applicationValidationRun
        })
        .code(statusCodes.ok)
    } catch (error) {
      const errorMessage = 'Error getting application validation run'
      request.logger.error(errorMessage, {
        error: error.message,
        stack: error.stack
      })
      return Boom.internal(errorMessage)
    }
  }
}
