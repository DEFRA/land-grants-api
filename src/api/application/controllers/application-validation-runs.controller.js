import Boom from '@hapi/boom'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/api/common/schema/index.js'
import {
  applicationValidationRunsRequestSchema,
  applicationValidationRunsBodyRequestSchema,
  applicationValidationRunsResponseSchema
} from '../schema/application-validation.schema.js'
import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import { getApplicationValidationRuns } from '../queries/getApplicationValidationRuns.query.js'
import { applicationValidationRunTransformer } from '../transformers/application.transformer.js'

export const ApplicationValidationRunsController = {
  options: {
    tags: ['api'],
    description: 'Returns all application validation runs',
    notes: 'Returns all validation runs for a specific application',
    validate: {
      params: applicationValidationRunsRequestSchema,
      payload: applicationValidationRunsBodyRequestSchema
    },
    response: {
      status: {
        200: applicationValidationRunsResponseSchema,
        404: errorResponseSchema,
        500: internalServerErrorResponseSchema
      }
    }
  },
  handler: async (request, h) => {
    try {
      const { applicationId } = request.params
      const { fields } = request.payload

      const applicationValidationRuns = await getApplicationValidationRuns(
        request.logger,
        request.server.postgresDb,
        applicationId
      )

      const response = fields.includes('details')
        ? applicationValidationRuns
        : applicationValidationRunTransformer(applicationValidationRuns)

      return h
        .response({
          message: 'Application validation runs retrieved successfully',
          applicationValidationRuns: response
        })
        .code(statusCodes.ok)
    } catch (error) {
      const errorMessage = 'Error getting application validation runs'
      request.logger.error(errorMessage, {
        error: error.message,
        stack: error.stack
      })
      return Boom.internal(errorMessage)
    }
  }
}
