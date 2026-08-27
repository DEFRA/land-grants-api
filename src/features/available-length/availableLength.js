import { METERS } from '~/src/features/common/constants/unit_type.js'
import { getLandParcelBoundary } from '../parcel/queries/getParcelBoundary.query.js'
import { createFilterActionByUnit } from '../common/helpers/filter-action-by-unit.js'

/**
 * Calculates the availble boundary length of a parcel
 * @param {ActionRequest} action - The action
 * @param {Action[]} actions - All enabled actions
 * @param {AgreementAction[]} agreements - The agreements
 * @param {CompatibilityCheckFn} compatibilityCheckFn - Compatibility check function
 * @param {LandAction} landAction - The land action
 * @param {{logger: object, server: {postgresDb: object}}} request - The request object
 * @returns {Promise<{availableLength: number}>} The validation result
 */
export async function getAvailableLength(
  action,
  actions,
  agreements,
  compatibilityCheckFn,
  landAction,
  request
) {
  const filterActionByUnit = createFilterActionByUnit(actions, METERS)
  const siblingActions = landAction.actions
    .filter((a) => a !== action)
    .filter(filterActionByUnit)
    .map(mapAction)

  const existingActions = agreements.map(mapAction).concat(siblingActions)
  const incompatibleLength = existingActions
    .filter((a) => !compatibilityCheckFn(a.actionCode, action.code))
    .reduce((prev, cur) => {
      return prev + cur.boundaryLengthMeters
    }, 0)

  const boundaryResult = await getLandParcelBoundary(
    landAction.sheetId,
    landAction.parcelId,
    request.server.postgresDb,
    request.logger
  )

  if (!boundaryResult) {
    return {
      availableLength: 0
    }
  }
  const { boundaryLengthMeters } = boundaryResult

  return {
    availableLength: boundaryLengthMeters - incompatibleLength
  }
}

/**
 * @param {{ code?: string, actionCode?: string, quantity: number }} action
 * @returns {{actionCode: string, boundaryLengthMeters:number}}
 */
function mapAction(action) {
  return {
    actionCode: /** @type {string} */ (action?.code ?? action?.actionCode),
    boundaryLengthMeters: Math.round(action.quantity)
  }
}

/**
 * @import { ActionRequest } from '~/src/features/application/application.d.js'
 * @import { Action } from '~/src/features/actions/action.d.js'
 * @import { AgreementAction } from '~/src/features/agreements/agreements.d.js'
 * @import { CompatibilityCheckFn } from '~/src/features/available-area/available-area.d.js'
 * @import { LandAction, LandActionEntry } from '~/src/features/payment/payment.d.js'
 */
