import Boom from '@hapi/boom'

import { createCompatibilityMatrix } from '~/src/features/available-area/compatibilityMatrix.js'
import { expiredActionsFilter } from '~/src/features/agreements/transformers/filters.js'
import { getAgreements } from '~/src/features/agreements/repo.js'
import { logValidationWarn } from '~/src/features/common/helpers/logging/log-helpers.js'
import { validateLandParcelActions } from './land-parcel-validation.service.js'
import { validateRequest } from '../validation/application.validation.js'

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
 * @param {string} sbi
 * @param {string|null} defraIdToken
 * @param {object} data
 * @param {Array} data.landActions
 * @param {Array} data.actions
 * @returns {Promise<Array>}
 */
export const validateAllLandParcels = async (
  request,
  postgresDb,
  sbi,
  defraIdToken,
  { landActions, actions }
) => {
  const compatibilityCheckFn = await createCompatibilityMatrix(
    request.logger,
    postgresDb
  )
  const allAgreements = await getAgreements(
    sbi,
    landActions.map((a) => [a.parcelId, a.sheetId]),
    defraIdToken,
    postgresDb,
    request.logger
  )

  const parcelResults = await Promise.all(
    landActions.map(async (landAction) => {
      const agreements = (
        allAgreements[`${landAction.parcelId}-${landAction.sheetId}`] || []
      ).filter((a) => expiredActionsFilter(a))

      return validateLandParcelActions(
        landAction,
        actions,
        compatibilityCheckFn,
        request,
        agreements
      )
    })
  )

  return parcelResults
}
