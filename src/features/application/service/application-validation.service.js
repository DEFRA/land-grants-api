import { applicationDataTransformer } from '../transformers/application.transformer.js'
import { createCompatibilityMatrix } from '~/src/features/available-area/compatibilityMatrix.js'
import { expiredActionsFilter } from '~/src/features/agreements/transformers/filters.js'
import { getActions } from '../../actions/service/action.service.js'
import { getAgreements } from '~/src/features/agreements/repo.js'
import { logValidationWarn } from '../../common/helpers/logging/log-helpers.js'
import { saveApplication } from '../mutations/saveApplication.mutation.js'
import { validateLandParcelActions } from './land-parcel-validation.service.js'
import { validateRequest } from '../validation/application.validation.js'

/**
 * Validate application
 * @param {object[]} landAction - The land action
 * @param {string} applicationId - The application id
 * @param {string} crn - The crn
 * @param {string} sbi - The sbi
 * @param {string} requesterUsername - The requester username
 * @param {object} request - The request
 * @param {Date} [referenceDate] - The date to check active agreements against; defaults to now.
 * @returns {Promise<{validationErrors: object[] | null, applicationData: object, applicationValidationRunId: string | null}>} The validation errors, application data and validation run id
 */
export const validateApplication = async (
  landAction,
  applicationId,
  crn,
  sbi,
  requesterUsername,
  request,
  referenceDate
) => {
  const actions = await getActions(
    request,
    request.server.postgresDb,
    landAction,
    applicationId
  )

  // Validate the entire request
  const validationErrors = await validateRequest(landAction, actions, request)

  // If there are validation errors, return a bad request response
  if (validationErrors && validationErrors.length > 0) {
    logValidationWarn(request.logger, {
      operation: 'Application validation',
      errors: validationErrors,
      context: { sbi, crn, requesterUsername, applicationId }
    })

    return {
      validationErrors,
      applicationData: null,
      applicationValidationRunId: null
    }
  }

  // Create a compatibility check function
  const compatibilityCheckFn = await createCompatibilityMatrix(
    request.logger,
    request.server.postgresDb
  )

  const allAgreements = await getAgreements(
    sbi,
    landAction.map((a) => [a.parcelId, a.sheetId]),
    null, // No DEFRA token on caseworker route
    request.server.postgresDb,
    request.logger
  )

  // Validate each land action
  const parcelResults = await Promise.all(
    landAction.map(async (la) => {
      const agreements = (
        allAgreements[`${la.parcelId}-${la.sheetId}`] || []
      ).filter((a) => expiredActionsFilter(a, referenceDate))

      return validateLandParcelActions(
        la,
        actions,
        compatibilityCheckFn,
        request,
        agreements
      )
    })
  )

  // Transform the application data
  const applicationData = applicationDataTransformer(
    applicationId,
    crn,
    sbi,
    requesterUsername,
    landAction,
    parcelResults
  )

  // Save the application
  const applicationValidationRunId = await saveApplication(
    request.logger,
    request.server.postgresDb,
    {
      application_id: applicationId,
      sbi,
      crn,
      data: applicationData
    }
  )

  return { validationErrors, applicationData, applicationValidationRunId }
}
