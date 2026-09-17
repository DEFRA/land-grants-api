import { getAgreements } from '~/src/features/agreements/repo.js'
import { expiredActionsFilter } from '~/src/features/agreements/transformers/filters.js'
import { validateLandAction } from './action-validation.service.js'

/**
 * Validate land parcel actions
 * @param {string} sbi - The SBI for the business
 * @param {object} landAction - The land action requested for validation
 * @param {object} actions - The actions
 * @param {object} compatibilityCheckFn - The compatibility check function
 * @param {object} request - The request
 * @param {string|null} defraIdToken - The JWT token for the end user in DEFRA ID
 * @param {Date} [referenceDate] - The date to check agreement activity against, defaults to now
 */
export const validateLandParcelActions = async (
  sbi,
  landAction,
  actions,
  compatibilityCheckFn,
  request,
  defraIdToken,
  referenceDate
) => {
  if (!landAction || !actions || !compatibilityCheckFn) {
    throw new Error('Unable to validate land parcel actions')
  }

  const allAgreements = await getAgreements(
    sbi,
    [[landAction.parcelId, landAction.sheetId]],
    defraIdToken,
    request.server.postgresDb,
    request.logger
  )

  const agreements = (
    allAgreements[`${landAction.parcelId}-${landAction.sheetId}`] || []
  ).filter((a) => expiredActionsFilter(a, referenceDate))

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
