import { createCompatibilityMatrix } from '~/src/features/available-area/compatibilityMatrix.js'
import { saveApplication } from '../mutations/saveApplication.mutation.js'
import { applicationDataTransformer } from '../transformers/application.transformer.js'
import { validateLandParcelActions } from './land-parcel-validation.service.js'
import { validateRequest } from '../validation/application.validation.js'
import { getEnabledActions } from '../../actions/queries/1.0.0/getActions.query.js'
import { logValidationWarn } from '../../common/helpers/logging/log-helpers.js'

/**
 * Validate application
 * @param {object[]} landAction - The land action
 * @param {string} applicationId - The application id
 * @param {string} crn - The crn
 * @param {string} sbi - The sbi
 * @param {string} requesterUsername - The requester username
 * @param {object} request - The request
 * @returns {Promise<{validationErrors: object[] | null, applicationData: object, applicationValidationRunId: string | null}>} The validation errors, application data and validation run id
 */
export const validateApplication = async (
  landAction,
  applicationId,
  crn,
  sbi,
  requesterUsername,
  request
) => {
  // Get all the enabled actions
  const actions = await getEnabledActions(
    request.logger,
    request.server.postgresDb
  )

  // Validate the entire request
  const validationErrors = await validateRequest(landAction, actions, request)

  // If there are validation errors, return a bad request response
  if (validationErrors && validationErrors.length > 0) {
    logValidationWarn(request.logger, {
      operation: 'Application validation',
      errors: validationErrors,
      context: {
        sbi,
        crn,
        requesterUsername,
        applicationId
      }
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

  // Validate each land action
  const parcelResults = await Promise.all(
    landAction.map(async (la) =>
      validateLandParcelActions(la, actions, compatibilityCheckFn, request)
    )
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
      // eslint-disable-next-line camelcase
      application_id: applicationId,
      sbi,
      crn,
      data: applicationData
    }
  )

  return { validationErrors, applicationData, applicationValidationRunId }
}
