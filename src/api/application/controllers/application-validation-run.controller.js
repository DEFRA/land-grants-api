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
  handler: async (request, h) => {
    try {
      const { id } = request.params
      const applicationValidationRun = await getApplicationValidationRun(
        request.logger,
        request.server.postgresDb,
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
        .code(200)
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
