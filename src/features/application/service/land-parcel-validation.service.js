import { validateLandAction } from './action-validation.service.js'

/**
 * Validate land parcel actions
 * @param {object} landAction - The land action requested for validation
 * @param {object} actions - The actions
 * @param {object} compatibilityCheckFn - The compatibility check function
 * @param {object} request - The request
 * @param {AgreementAction[]} agreements - Existing agreements related to this land parcel
 */
export const validateLandParcelActions = async (
  landAction,
  actions,
  compatibilityCheckFn,
  request,
  agreements
) => {
  if (!landAction || !actions || !compatibilityCheckFn) {
    throw new Error('Unable to validate land parcel actions')
  }

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

/**
 * @import { AgreementAction } from '~/src/features/agreements/agreements.d.js'
 */
