import { validateActionOnParcel } from './action-validation.service.js'

/**
 * Validate land parcel actions
 * @param {object} landAction - The land action requested for validation
 * @param {object} actions - The actions
 * @param {CompatibilityCheckFn} compatibilityCheckFn - The compatibility check function
 * @param {object} request - The request
 * @param {AgreementAction[]} agreements - Existing agreements related to this land parcel
 * @param {Map<string, Set<string>>} [baseCodesBySupplement] - The base actions of each supplement, for the supplement rules
 */
export const validateLandParcelActions = async (
  landAction,
  actions,
  compatibilityCheckFn,
  request,
  agreements,
  baseCodesBySupplement = new Map()
) => {
  if (!landAction || !actions || !compatibilityCheckFn) {
    throw new Error('Unable to validate land parcel actions')
  }

  const actionResults = await Promise.all(
    landAction.actions.map((action) =>
      validateActionOnParcel(
        action,
        actions,
        agreements,
        compatibilityCheckFn,
        landAction,
        request,
        baseCodesBySupplement
      )
    )
  )

  return {
    sheetId: landAction.sheetId,
    parcelId: landAction.parcelId,
    actions: actionResults
  }
}

/**
 * @import { AgreementAction } from '~/src/features/agreements/agreements.d.js'
 * @import { CompatibilityCheckFn } from '~/src/features/available-area/available-area.d.js'
 */
