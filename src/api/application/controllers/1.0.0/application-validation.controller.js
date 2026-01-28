import Boom from '@hapi/boom'
import {
  applicationValidationSchema,
  applicationValidationResponseSchema
} from '~/src/api/application/schema/application-validation.schema.js'
import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/api/common/schema/index.js'
import { createCompatibilityMatrix } from '~/src/available-area/compatibilityMatrix.js'
import { validateLandParcelActions } from '../../service/land-parcel-validation.service.js'
import { saveApplication } from '~/src/api/application/mutations/saveApplication.mutation.js'
import {
  errorMessagesTransformer,
  applicationDataTransformer
} from '../../transformers/application.transformer.js'
import { validateRequest } from '../../validation/application.validation.js'
import { getEnabledActions } from '~/src/api/actions/queries/index.js'
import { quantityValidationFailAction } from '~/src/api/common/helpers/joi-validations.js'
import {
  logValidationWarn,
  logBusinessError,
  logInfo
} from '~/src/api/common/helpers/logging/log-helpers.js'

/**
 * Validate request against enabled actions
 * @param {import('@hapi/hapi').Request} request
 * @param {object} data
 * @param {Array} data.landActions
 * @param {Array} data.actions
 * @param {string} data.applicationId
 * @param {string} data.sbi
 * @returns {Promise<import('@hapi/boom').Boom | null>}
 */
const validateRequestData = async (
  request,
  { landActions, actions, applicationId, sbi }
) => {
  const validationErrors = await validateRequest(landActions, actions, request)

  if (validationErrors && validationErrors.length > 0) {
    logValidationWarn(request.logger, {
      operation: 'Application validation',
      errors: validationErrors,
      context: {
        sbi,
        applicationId
      }
    })
    return Boom.badRequest(validationErrors.join(', '))
  }

  return null
}

/**
 * Validate all land parcel actions
 * @param {import('@hapi/hapi').Request} request
 * @param {object} postgresDb
 * @param {object} data
 * @param {Array} data.landActions
 * @param {Array} data.actions
 * @returns {Promise<Array>}
 */
const validateAllLandParcels = async (
  request,
  postgresDb,
  { landActions, actions }
) => {
  const compatibilityCheckFn = await createCompatibilityMatrix(
    request.logger,
    postgresDb
  )

  const parcelResults = await Promise.all(
    landActions.map(async (landAction) => {
      return validateLandParcelActions(
        landAction,
        actions,
        compatibilityCheckFn,
        request
      )
    })
  )

  return parcelResults
}

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
    errorMessages: errorMessagesTransformer(parcelResults),
    id
  }
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
        200: applicationValidationResponseSchema,
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
      const { landActions, applicationId, sbi, applicantCrn, requester } =
        request.payload

      logInfo(request.logger, {
        category: 'application',
        message: 'Started application validation',
        context: {
          applicationId,
          sbi,
          crn: applicantCrn
        }
      })

      // Get enabled actions
      const actions = await getEnabledActions(request.logger, postgresDb)

      // Validate request data
      const validationError = await validateRequestData(request, {
        landActions,
        actions,
        applicationId,
        sbi
      })
      if (validationError) {
        return validationError
      }

      // Validate all land parcels
      const parcelResults = await validateAllLandParcels(request, postgresDb, {
        landActions,
        actions
      })

      // Save validation results
      const id = await saveValidationResults(request, postgresDb, {
        applicationId,
        applicantCrn,
        sbi,
        requester,
        landActions,
        parcelResults
      })

      // Build response
      const responseData = buildValidationResponse(
        applicationId,
        applicantCrn,
        sbi,
        requester,
        landActions,
        parcelResults,
        id
      )

      logInfo(request.logger, {
        category: 'application',
        message: 'Application validation result',
        context: {
          applicationId,
          sbi,
          crn: applicantCrn,
          valid: responseData.valid,
          errorCount: responseData.errorMessages.length
        }
      })

      return h.response(responseData).code(statusCodes.ok)
    } catch (error) {
      // @ts-expect-error - payload
      const { landActions, applicationId, sbi } = request.payload
      logBusinessError(request.logger, {
        operation: 'Validate application',
        error,
        context: {
          sbi,
          applicationId,
          landActionsCount: landActions?.length ?? 0
        }
      })
      return Boom.internal(`Error validating application: ${error.message}`)
    }
  }
}

export { ApplicationValidationController }
