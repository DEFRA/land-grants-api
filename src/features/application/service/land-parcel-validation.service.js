import { getAgreements } from '~/src/features/agreements/repo.js'
import { validateLandAction } from './action-validation.service.js'

/**
 * Validate land parcel actions
 * @param {string} sbi - The SBI for the business
 * @param {object} landAction - The land action requested for validation
 * @param {object} actions - The actions
 * @param {object} compatibilityCheckFn - The compatibility check function
 * @param {object} request - The request
 * @param {string|null} defraIdToken - The JWT token for the end user in DEFRA ID
 */
export const validateLandParcelActions = async (
  sbi,
  landAction,
  actions,
  compatibilityCheckFn,
  request,
  defraIdToken
) => {
  if (!landAction || !actions || !compatibilityCheckFn) {
    throw new Error('Unable to validate land parcel actions')
  }

  // Get agreements and filter them to only area-based actions, as only
  // these should be used for Available Area Calculations
  const agreements = await getAgreements(
    sbi,
    landAction.sheetId,
    landAction.parcelId,
    defraIdToken,
    request.server.postgresDb,
    request.logger
  )

  const actionResults = await Promise.all(
    landAction.actions.map(async (action) => {
      return validateLandAction(
        action,
        actions,
        agreements,
        compatibilityCheckFn,
        landAction,
        request
      )
    })
  )

  return {
    sheetId: landAction.sheetId,
    parcelId: landAction.parcelId,
    actions: actionResults
  }
}
