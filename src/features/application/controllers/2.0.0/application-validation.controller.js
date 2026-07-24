import Boom from '@hapi/boom'
import { applicationValidationSchema } from '~/src/features/application/schema/application-validation.schema.js'
import { applicationValidationResponseSchemaV2 } from '~/src/features/application/schema/2.0.0/application-validation.schema.js'
import { statusCodes } from '~/src/features/common/constants/status-codes.js'
import {
  errorResponseSchema,
  unprocessableEntityResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/features/common/schema/index.js'
import { saveApplication } from '~/src/features/application/mutations/saveApplication.mutation.js'
import {
  applicationDataTransformer,
  actionValidationResultsTransformer
} from '../../transformers/application.transformer.js'
import { quantityValidationFailAction } from '~/src/features/common/helpers/joi-validations.js'
import {
  logBusinessError,
  logInfo
} from '~/src/features/common/helpers/logging/log-helpers.js'
import {
  validateRequestData,
  validateAllLandParcels
} from '~/src/features/application/service/validation.service.js'
import { getActions } from '~/src/features/actions/service/action.service.js'
import { InfeasibleAreaError } from '~/src/features/available-area/availableArea.js'
import {
  AuditEvent,
  auditEvent,
  getCorrelationId
} from '~/src/features/common/helpers/audit-event.js'

/**
 * Builds the shared portion of an application validation audit context.
 * @param {import('@hapi/hapi').Request} request
 * @param {object} params
 * @param {string} params.applicationId
 * @param {string} params.sbi
 * @param {string} params.applicantCrn
 * @returns {object}
 */
const buildAuditContext = (request, { applicationId, sbi, applicantCrn }) => ({
  correlationId: getCorrelationId(request),
  applicationId,
  identifiers: { sbi, crn: applicantCrn }
})

/**
 * Save application validation results
 * @param {import('@hapi/hapi').Request} request
 * @param {object} postgresDb
 * @param {object} data
 * @param {string} data.applicationId
 * @param {string} data.applicantCrn
 * @param {string} data.sbi
 * @param {string} data.requester
 * @param {Array} data.landActions
 * @param {Array} data.parcelResults
 * @returns {Promise<string | null>}
 */
const saveValidationResults = async (
  request,
  postgresDb,
  { applicationId, applicantCrn, sbi, requester, landActions, parcelResults }
) => {
  const applicationData = applicationDataTransformer(
    applicationId,
    applicantCrn,
    sbi,
    requester,
    landActions,
    parcelResults
  )

  const id = await saveApplication(request.logger, postgresDb, {
    application_id: applicationId,
    sbi,
    crn: applicantCrn,
    data: applicationData
  })

  return id
}

/**
 * Build validation response
 * @param {string} applicationId
 * @param {string} applicantCrn
 * @param {string} sbi
 * @param {string} requester
 * @param {Array} landActions
 * @param {Array} parcelResults
 * @param {string | null} id
 * @returns {object}
 */
const buildValidationResponse = (
  applicationId,
  applicantCrn,
  sbi,
  requester,
  landActions,
  parcelResults,
  id
) => {
  const applicationData = applicationDataTransformer(
    applicationId,
    applicantCrn,
    sbi,
    requester,
    landActions,
    parcelResults
  )

  return {
    message: 'Application validated successfully',
    valid: applicationData.hasPassed,
    actions: actionValidationResultsTransformer(parcelResults),
    id
  }
}

/**
 * Runs the application validation pipeline: resolves the enabled actions,
 * validates the request, validates every land parcel, persists the result
 * and builds the client-facing response.
 * @param {import('@hapi/hapi').Request} request
 * @param {object} postgresDb - Postgres connection
 * @param {object} params
 * @param {Array} params.landActions
 * @param {string} params.applicationId
 * @param {string} params.sbi
 * @param {string} params.applicantCrn
 * @param {string} params.requester
 * @returns {Promise<object | import('@hapi/boom').Boom>} Validation response, or a Boom error response
 */
const runApplicationValidation = async (
  request,
  postgresDb,
  { landActions, applicationId, sbi, applicantCrn, requester }
) => {
  const defraIdToken = /** @type {string} */ (
    request.headers['x-forwarded-authorization']
  )
  if (!defraIdToken) {
    return Boom.unauthorized('X-Forwarded-Authorization is required')
  }

  const actions = await getActions(
    request,
    postgresDb,
    landActions,
    applicationId
  )

  const validationError = await validateRequestData(request, {
    landActions,
    actions,
    applicationId,
    sbi
  })
  if (validationError) {
    return validationError
  }

  const parcelResults = await validateAllLandParcels(
    request,
    postgresDb,
    sbi,
    defraIdToken,
    {
      landActions,
      actions
    }
  )

  const id = await saveValidationResults(request, postgresDb, {
    applicationId,
    applicantCrn,
    sbi,
    requester,
    landActions,
    parcelResults
  })

  return buildValidationResponse(
    applicationId,
    applicantCrn,
    sbi,
    requester,
    landActions,
    parcelResults,
    id
  )
}

/**
 * Handles errors thrown during application validation.
 * @param {Error} error
 * @param {import('@hapi/hapi').Request} request
 * @returns {Promise<import('@hapi/boom').Boom>}
 */
const handleValidationError = async (error, request) => {
  if (error instanceof InfeasibleAreaError) {
    return Boom.boomify(error, { statusCode: 422 })
  }
  // @ts-expect-error - payload
  const { landActions, applicationId, sbi, applicantCrn } = request.payload
  logBusinessError(request.logger, {
    operation: 'Validate application',
    error,
    context: {
      sbi,
      applicationId,
      landActionsCount: landActions?.length ?? 0
    }
  })

  await auditEvent(
    AuditEvent.SFI_APPLICATION_VALIDATED,
    {
      ...buildAuditContext(request, { applicationId, sbi, applicantCrn }),
      request: { landActions },
      error: error.message
    },
    'failure',
    request
  )

  return Boom.internal(`Error validating application: ${error.message}`)
}

/**
 * Publishes the eligibility decision audit event for a completed application
 * validation, including the per-action rule decisions and explanations.
 * @param {import('@hapi/hapi').Request} request
 * @param {object} params
 * @param {string} params.applicationId
 * @param {string} params.sbi
 * @param {string} params.applicantCrn
 * @param {Array} params.landActions
 * @param {object} params.responseData
 * @returns {Promise<void>}
 */
const sendValidationAuditEvent = async (
  request,
  { applicationId, sbi, applicantCrn, landActions, responseData }
) => {
  await auditEvent(
    AuditEvent.SFI_APPLICATION_VALIDATED,
    {
      ...buildAuditContext(request, { applicationId, sbi, applicantCrn }),
      request: { landActions },
      response: { valid: responseData.valid, actions: responseData.actions }
    },
    'success',
    request
  )
}

const ApplicationValidationController = {
  options: {
    tags: ['api'],
    description: 'Validate an application',
    notes:
      'Validates a full application including all parcels and land actions',
    validate: {
      payload: applicationValidationSchema,
      failAction: quantityValidationFailAction
    },
    response: {
      status: {
        200: applicationValidationResponseSchemaV2,
        404: errorResponseSchema,
        422: unprocessableEntityResponseSchema,
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
      const { landActions, applicationId, applicantCrn, requester } =
        request.payload

      // @ts-expect-error - payload
      const sbi = String(request.payload.sbi)

      logInfo(request.logger, {
        category: 'application',
        message: 'Started application validation',
        context: {
          applicationId,
          sbi,
          crn: applicantCrn
        }
      })

      const validationResult = await runApplicationValidation(
        request,
        postgresDb,
        {
          landActions,
          applicationId,
          sbi,
          applicantCrn,
          requester
        }
      )
      if (Boom.isBoom(validationResult)) {
        return validationResult
      }
      const responseData = validationResult

      logInfo(request.logger, {
        category: 'application',
        message: 'Application validation result',
        context: {
          applicationId,
          sbi,
          crn: applicantCrn,
          valid: responseData.valid
        }
      })

      await sendValidationAuditEvent(request, {
        applicationId,
        sbi,
        applicantCrn,
        landActions,
        responseData
      })

      return h.response(responseData).code(statusCodes.ok)
    } catch (error) {
      return handleValidationError(error, request)
    }
  }
}

export { ApplicationValidationController }
