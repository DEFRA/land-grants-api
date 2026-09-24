import { METERS } from '~/src/features/common/constants/unit_type.js'
import { getLandParcelBoundary } from '../parcel/queries/getParcelBoundary.query.js'
import { createFilterActionByUnit } from '../common/helpers/filter-action-by-unit.js'

/**
 * Deducts the boundary already committed to incompatible actions from a parcel's
 * perimeter. Takes lengths that callers have gathered and filtered to metres.
 * @param {string} actionCode - The action code being applied for
 * @param {ActionWithLength[]} existingActions - Actions already competing for the boundary
 * @param {CompatibilityCheckFn} compatibilityCheckFn - Compatibility check function
 * @param {number} boundaryLengthMeters - The parcel's perimeter in metres
 * @returns {AvailableLength} The available length and the figures behind it
 */
export function calculateAvailableLength(
  actionCode,
  existingActions,
  compatibilityCheckFn,
  boundaryLengthMeters
) {
  const incompatibleLengthMeters = existingActions
    .filter((a) => !compatibilityCheckFn(a.actionCode, actionCode))
    .reduce((total, a) => total + Math.round(a.boundaryLengthMeters), 0)

  return {
    availableLength: Math.max(
      0,
      boundaryLengthMeters - incompatibleLengthMeters
    ),
    boundaryLengthMeters,
    incompatibleLengthMeters
  }
}

/**
 * Calculates the availble boundary length of a parcel
 * @param {ActionRequest} action - The action
 * @param {Action[]} actions - All enabled actions
 * @param {AgreementAction[]} agreements - The agreements
 * @param {CompatibilityCheckFn} compatibilityCheckFn - Compatibility check function
 * @param {LandAction} landAction - The land action
 * @param {{logger: object, server: {postgresDb: object}}} request - The request object
 * @returns {Promise<AvailableLength>} The validation result
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

  // Agreements arrive in every unit; only those measured in metres compete
  // for the parcel's boundary length.
  const existingActions = agreements
    .filter((a) => a.unit === METERS)
    .map(mapAction)
    .concat(siblingActions)

  const boundaryResult = await getLandParcelBoundary(
    landAction.sheetId,
    landAction.parcelId,
    request.server.postgresDb,
    request.logger
  )

  // A boundary that cannot be read reports zero, as does one committed beyond
  // its own length - the two are told apart by the figures returned alongside.
  const boundaryLengthMeters = boundaryResult?.boundaryLengthMeters ?? 0

  return calculateAvailableLength(
    action.code,
    existingActions,
    compatibilityCheckFn,
    boundaryLengthMeters
  )
}

/**
 * @param {{ code?: string, actionCode?: string, quantity: number }} action
 * @returns {ActionWithLength}
 */
function mapAction(action) {
  return {
    actionCode: /** @type {string} */ (action?.code ?? action?.actionCode),
    boundaryLengthMeters: action.quantity
  }
}

/**
 * @import { ActionRequest } from '~/src/features/application/application.d.js'
 * @import { Action } from '~/src/features/actions/action.d.js'
 * @import { AgreementAction } from '~/src/features/agreements/agreements.d.js'
 * @import { ActionWithLength, AvailableLength } from '~/src/features/available-length/available-length.d.js'
 * @import { CompatibilityCheckFn } from '~/src/features/available-area/available-area.d.js'
 * @import { LandAction, LandActionEntry } from '~/src/features/payment/payment.d.js'
 */
