import { getAgreementsForParcel } from '../../agreements/queries/getAgreementsForParcel.query.js'
import { validateLandAction } from './action-validation.service.js'

/**
 * Validate land parcel actions
 * @param {object} landAction - The land action requested for validation
 * @param {object} actions - The actions
 * @param {object} compatibilityCheckFn - The compatibility check function
 * @param {object} request - The request
 */
export const validateLandParcelActions = async (
  landAction,
  actions,
  compatibilityCheckFn,
  request
) => {
  if (!landAction || !actions || !compatibilityCheckFn) {
    throw new Error('Unable to validate land parcel actions')
  }

  const agreements = await getAgreementsForParcel(
    landAction.sheetId,
    landAction.parcelId,
    request.server.postgresDb,
    request.logger
  )

  const actionResults = await Promise.all(
    landAction.actions.map(async (action) => {
      return await validateLandAction(
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
