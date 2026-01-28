import Boom from '@hapi/boom'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/api/common/schema/index.js'
import { getApplicationValidationRun } from '~/src/api/application/queries/getApplicationValidationRun.query.js'
import {
  caseManagementApplicationValidationRunRequestSchema,
  caseManagementApplicationValidationRunResponseSchema
} from '~/src/api/case-management-adapter/schema/application-validation.schema.js'
import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import { applicationValidationRunToCaseManagement } from '../transformers/application-validation.transformer.js'
import { logBusinessError } from '../../common/helpers/logging/log-helpers.js'

/** @typedef {import('~/src/api/application/application.d.js').ApplicationValidationRun} ApplicationValidationRun */

export const CaseManagementApplicationValidationRunController = {
  options: {
    tags: ['api'],
    description: 'Returns an application validation run',
    notes: 'Returns a validation run for a specific application',
    validate: {
      params: caseManagementApplicationValidationRunRequestSchema
    },
    response: {
      status: {
        200: caseManagementApplicationValidationRunResponseSchema,
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
      // @ts-expect-error - postgresDb
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

      /** @type {ApplicationValidationRun} */
      const applicationValidationRunData = applicationValidationRun.data
      const response = applicationValidationRunToCaseManagement(
        applicationValidationRunData
      )

      return h
        .response({
          message: 'Application validation run retrieved successfully',
          response
        })
        .code(statusCodes.ok)
    } catch (error) {
      const errorMessage = 'Error getting application validation run'
      const { id } = request.params

      logBusinessError(request.logger, {
        operation: 'Application validation run',
        error,
        context: { id }
      })
      return Boom.internal(errorMessage)
    }
  }
}
