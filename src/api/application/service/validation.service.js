import Boom from '@hapi/boom'
import { validateRequest } from '../validation/application.validation.js'
import { logValidationWarn } from '~/src/api/common/helpers/logging/log-helpers.js'
import { validateLandParcelActions } from './land-parcel-validation.service.js'
import { createCompatibilityMatrix } from '~/src/available-area/compatibilityMatrix.js'

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
export const validateRequestData = async (
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
export const validateAllLandParcels = async (
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
