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
import {
  AuditEvent,
  auditEvent,
  getCorrelationId
} from '~/src/features/common/helpers/audit-event.js'

/**
 * Builds the shared portion of a case management application validation
 * audit context.
 * @param {import('@hapi/hapi').Request} request
 * @param {object} params
 * @param {string} params.applicationId
 * @param {string} params.sbi
 * @param {string} params.crn
 * @returns {object}
 */
const buildAuditContext = (request, { applicationId, sbi, crn }) => ({
  correlationId: getCorrelationId(request),
  applicationId,
  identifiers: { sbi, crn }
})

/**
 * Fetches the application validation run to re-run, returning a 404 Boom
 * response when it cannot be found.
 * @param {import('@hapi/hapi').Request} request
 * @param {object} postgresDb
 * @param {string} id
 * @returns {Promise<object | import('@hapi/boom').Boom>}
 */
const fetchApplicationValidationRun = async (request, postgresDb, id) => {
  const applicationValidationRun = await getApplicationValidationRun(
    request.logger,
    postgresDb,
    id
  )

  if (!applicationValidationRun) {
    logResourceNotFound(request.logger, {
      resourceType: 'Application validation run',
      context: { validationRunId: id }
    })
    return Boom.notFound('Application validation run not found')
  }

  return applicationValidationRun
}

/**
 * Runs the eligibility re-validation for a case management validation run,
 * persists the result and publishes the success audit event.
 * @param {import('@hapi/hapi').Request} request
 * @param {object} applicationValidationRun
 * @param {object} params
 * @param {string} params.requesterUsername
 * @param {string} params.id
 * @returns {Promise<object | import('@hapi/boom').Boom>}
 */
const runCaseManagementValidation = async (
  request,
  applicationValidationRun,
  { requesterUsername, id }
) => {
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

  await auditEvent(
    AuditEvent.SFI_APPLICATION_VALIDATED,
    {
      ...buildAuditContext(request, { applicationId, sbi, crn }),
      request: {
        validationRunId: id,
        requesterUsername,
        parcels: data.application.parcels
      },
      response: {
        valid: applicationData.hasPassed,
        id: applicationValidationRunId
      }
    },
    'success',
    request
  )

  return {
    message: 'Application validated successfully',
    valid: applicationData.hasPassed,
    id: applicationValidationRunId,
    date: applicationData.date
  }
}

/**
 * Handles unexpected errors thrown while re-running a case management
 * application validation: logs the error and publishes a failure audit
 * event.
 * @param {Error} error
 * @param {import('@hapi/hapi').Request} request
 * @param {object|undefined} applicationValidationRun
 * @returns {Promise<import('@hapi/boom').Boom>}
 */
const handleCaseManagementValidationError = async (
  error,
  request,
  applicationValidationRun
) => {
  // @ts-expect-error - payload
  const { requesterUsername, id } = request.payload
  logBusinessError(request.logger, {
    operation: 'Case Management validation run',
    error,
    context: { validationRunId: id, requesterUsername }
  })

  await auditEvent(
    AuditEvent.SFI_APPLICATION_VALIDATED,
    {
      ...(applicationValidationRun
        ? buildAuditContext(request, {
            applicationId: applicationValidationRun.application_id,
            sbi: applicationValidationRun.sbi,
            crn: applicationValidationRun.crn
          })
        : { correlationId: getCorrelationId(request) }),
      request: { validationRunId: id, requesterUsername },
      error: error.message
    },
    'failure',
    request
  )

  return Boom.internal('Error validating application')
}

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
    let applicationValidationRun
    try {
      // @ts-expect-error - postgresDb
      const postgresDb = request.server.postgresDb
      // @ts-expect-error - payload
      const { requesterUsername, id } = request.payload

      applicationValidationRun = await fetchApplicationValidationRun(
        request,
        postgresDb,
        id
      )
      if (Boom.isBoom(applicationValidationRun)) {
        return applicationValidationRun
      }

      const validationResult = await runCaseManagementValidation(
        request,
        applicationValidationRun,
        { requesterUsername, id }
      )
      if (Boom.isBoom(validationResult)) {
        return validationResult
      }

      return h.response(validationResult).code(statusCodes.ok)
    } catch (error) {
      return handleCaseManagementValidationError(
        error,
        request,
        applicationValidationRun
      )
    }
  }
}

export { CaseManagementApplicationValidationController }
