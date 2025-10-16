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
import { logBusinessError } from '~/src/api/common/helpers/logging/log-helpers.js'

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
  /**
   * Handler function for application validation
   * @param {import('@hapi/hapi').Request} request - Hapi request object
   * @param {import('@hapi/hapi').ResponseToolkit} h - Hapi response toolkit
   * @returns {Promise<import('@hapi/hapi').ResponseObject | import('@hapi/boom').Boom>} Validation response
   */
  handler: async (request, h) => {
    // @ts-expect-error - postgresDb
    const postgresDb = request.server.postgresDb
    const { applicationId } = request.params
    // @ts-expect-error - payload
    const { fields } = request.payload

    try {
      const applicationValidationRuns = await getApplicationValidationRuns(
        request.logger,
        postgresDb,
        applicationId
      )

      const response = fields.includes('details')
        ? applicationValidationRuns
        : applicationValidationRunTransformer(applicationValidationRuns ?? [])

      return h
        .response({
          message: 'Application validation runs retrieved successfully',
          applicationValidationRuns: response
        })
        .code(statusCodes.ok)
    } catch (error) {
      logBusinessError(request.logger, {
        operation: 'retrieve application validation runs',
        error,
        reference: `applicationId:${request.params?.applicationid}, fields:${fields.join(',')}`
      })
      return Boom.internal('Error getting application validation runs')
    }
  }
}
