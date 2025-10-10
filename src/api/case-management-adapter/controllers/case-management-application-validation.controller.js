import Boom from '@hapi/boom'
import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/api/common/schema/index.js'
import { getApplicationValidationRun } from '~/src/api/application/queries/getApplicationValidationRun.query.js'
import { caseManagementApplicationValidationRerunRequestSchema } from '../schema/application-validation.schema.js'
import { validateApplication } from '../../application/service/application-validation.service.js'

const CaseManagementApplicationValidationController = {
  options: {
    tags: ['api'],
    description: 'Validate an application',
    notes:
      'Validates a full application including all parcels and land actions',
    validate: {
      payload: caseManagementApplicationValidationRerunRequestSchema
    },
    response: {
      status: {
        // 200: applicationValidationResponseSchema,
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
      // @ts-expect-error - payload
      const { requesterUsername, id } = request.payload

      const applicationValidationRun = await getApplicationValidationRun(
        request.logger,
        postgresDb,
        id
      )

      if (!applicationValidationRun) {
        return Boom.notFound('Application validation run not found')
      }

      // eslint-disable-next-line camelcase
      const { sbi, crn, application_id, data } = applicationValidationRun

      const { validationErrors, applicationData, applicationValidationRunId } =
        await validateApplication(
          data.application.parcels,
          application_id,
          crn,
          sbi,
          requesterUsername,
          request
        )

      if (validationErrors && validationErrors.length > 0) {
        request.logger.error('Validation errors', validationErrors)
        return h
          .response({
            message: 'Application validation failed',
            valid: false,
            date: new Date(),
            id: null
          })
          .code(statusCodes.badRequest)
      }

      // Return the application validation result
      return h
        .response({
          message: 'Application validated successfully',
          valid: applicationData.hasPassed,
          id: applicationValidationRunId,
          date: applicationData.date
        })
        .code(statusCodes.ok)
    } catch (error) {
      const errorMessage = `Error validating application: ${error.message}`
      request.logger.error(errorMessage, {
        error: error.message,
        stack: error.stack
      })
      return Boom.internal(errorMessage)
    }
  }
}

export { CaseManagementApplicationValidationController }
