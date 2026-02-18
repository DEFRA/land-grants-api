import Boom from '@hapi/boom'
import { statusCodes } from '~/src/features/common/constants/status-codes.js'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/features/common/schema/index.js'
import { getApplicationValidationRun } from '~/src/features/application/queries/getApplicationValidationRun.query.js'
import {
  caseManagementApplicationValidationRerunRequestSchema,
  caseManagementApplicationValidationReRunResponseSchema
} from '../schema/application-validation.schema.js'
import { validateApplication } from '../../application/service/application-validation.service.js'
import {
  logResourceNotFound,
  logValidationWarn,
  logBusinessError
} from '~/src/features/common/helpers/logging/log-helpers.js'

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
        200: caseManagementApplicationValidationReRunResponseSchema,
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
        logResourceNotFound(request.logger, {
          resourceType: 'Application validation run',
          context: {
            validationRunId: id
          }
        })
        return Boom.notFound('Application validation run not found')
      }

      const {
        sbi,
        crn,
        application_id: applicationId,
        data
      } = applicationValidationRun

      const { validationErrors, applicationData, applicationValidationRunId } =
        await validateApplication(
          data.application.parcels,
          applicationId,
          crn,
          sbi,
          requesterUsername,
          request
        )

      if (validationErrors && validationErrors.length > 0) {
        logValidationWarn(request.logger, {
          operation: 'Case management application validation',
          errors: validationErrors.map((err) => err.message),
          context: {
            sbi,
            crn,
            validationRunId: id,
            requesterUsername,
            applicationId
          }
        })
        return Boom.badRequest(
          validationErrors.map((err) => err.message).join(', ')
        )
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
      // @ts-expect-error - postgresDb
      const { requesterUsername, id } = request.payload
      logBusinessError(request.logger, {
        operation: 'Case Management validation run',
        error,
        context: {
          validationRunId: id,
          requesterUsername
        }
      })
      return Boom.internal('Error validating application')
    }
  }
}

export { CaseManagementApplicationValidationController }
