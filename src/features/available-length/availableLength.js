import { METERS } from '~/src/features/common/constants/unit_type.js'
import {
  getUnitByActionCode,
  unitCompetedFor
} from '../common/helpers/action-unit.js'
import { lengthActionsTransformer } from '../parcel/transformers/parcelActions.transformer.js'
import { getLandParcelBoundary } from '../parcel/queries/getParcelBoundary.query.js'
import { getSidednessByActionCode } from '../actions/queries/getSidednessByActionCode.query.js'
import { billingFactorOf } from '~/src/features/common/constants/sidedness.js'

/**
 * The metres of boundary an existing action occupies, rounded up so a part
 * metre of boundary is never offered.
 * @param {ActionWithLength} existingAction - The existing action
 * @param {SidednessByActionCode} sidednessByActionCode - The sidedness of the codes involved
 * @returns {number} The physical extent in whole metres
 */
const physicalExtentMeters = (existingAction, sidednessByActionCode) => {
  const { actionCode, billedLengthMeters } = existingAction

  const billingFactor = billingFactorOf(sidednessByActionCode[actionCode])

  return Math.ceil(billedLengthMeters / billingFactor)
}

/**
 * Deducts the physical boundary occupied by incompatible actions from a
 * parcel's perimeter, and bills what is left at the applied-for action's rate.
 * Takes lengths that callers have gathered and filtered to metres.
 * @param {string} actionCode - The action code being applied for
 * @param {ActionWithLength[]} existingActions - Actions already competing for the boundary
 * @param {BoundaryContext} boundary - The parcel's perimeter, compatibility and sidedness
 * @returns {AvailableLength} The available length and the figures behind it
 */
export function calculateAvailableLength(
  actionCode,
  existingActions,
  { compatibilityCheckFn, boundaryLengthMeters, sidednessByActionCode }
) {
  const incompatibleActions = existingActions.filter(
    (existingAction) =>
      !compatibilityCheckFn(existingAction.actionCode, actionCode)
  )

  const incompatibleLengthMeters = incompatibleActions.reduce(
    (total, incompatibleAction) =>
      total + physicalExtentMeters(incompatibleAction, sidednessByActionCode),
    0
  )

  const availableBoundaryMeters = Math.max(
    0,
    boundaryLengthMeters - incompatibleLengthMeters
  )
  const targetBillingFactor = billingFactorOf(sidednessByActionCode[actionCode])
  const availableLength = availableBoundaryMeters * targetBillingFactor

  const exceedsBoundary = boundaryLengthMeters < incompatibleLengthMeters

  return {
    availableLength,
    boundaryLengthMeters,
    incompatibleLengthMeters,
    incompatibleActions,
    exceedsBoundary
  }
}

/**
 * Gathers the actions competing for a parcel's boundary and works out how much
 * of it is left for the one being applied for. The perimeter is read by the
 * caller, so this module stays free of I/O.
 * @param {Pick<ActionRequest, 'code'>} action - The action
 * @param {Action[]} actions - All enabled actions
 * @param {AgreementAction[]} agreements - The agreements
 * @param {CompatibilityCheckFn} compatibilityCheckFn - Compatibility check function
 * @param {Omit<LandAction, 'sbi'>} landAction - The land action
 * @param {object} db - The database connection
 * @param {object} logger - The logger
 * @returns {Promise<AvailableLength>} The validation result
 */
export async function getAvailableLength(
  action,
  actions,
  agreements,
  compatibilityCheckFn,
  landAction,
  db,
  logger
) {
  const unitByActionCode = getUnitByActionCode(actions)

  const competesForBoundary = (existingAction) =>
    unitCompetedFor(existingAction, unitByActionCode) === METERS

  const siblingActions = landAction.actions
    .filter((sibling) => sibling !== action)
    .filter(competesForBoundary)

  const lengthAgreements = agreements.filter(competesForBoundary)

  const existingActions = lengthActionsTransformer([
    ...lengthAgreements,
    ...siblingActions
  ])

  const boundaryResult = await getLandParcelBoundary(
    landAction.sheetId,
    landAction.parcelId,
    db,
    logger
  )

  // A boundary that cannot be read reports zero, as does one committed beyond
  // its own length - the two are told apart by the figures returned alongside.
  const boundaryLengthMeters = boundaryResult?.boundaryLengthMeters ?? 0

  const actionCodes = [
    ...new Set([
      action.code,
      ...existingActions.map(({ actionCode }) => actionCode)
    ])
  ]

  const sidednessByActionCode = await getSidednessByActionCode(
    actionCodes,
    db,
    logger
  )

  return calculateAvailableLength(action.code, existingActions, {
    compatibilityCheckFn,
    boundaryLengthMeters,
    sidednessByActionCode
  })
}

/**
 * @import { ActionRequest } from '~/src/features/application/application.d.js'
 * @import { Action } from '~/src/features/actions/action.d.js'
 * @import { AgreementAction } from '~/src/features/agreements/agreements.d.js'
 * @import { ActionWithLength, AvailableLength, BoundaryContext, SidednessByActionCode } from '~/src/features/available-length/available-length.d.js'
 * @import { CompatibilityCheckFn } from '~/src/features/available-area/available-area.d.js'
 * @import { LandAction } from '~/src/features/payment/payment.d.js'
 */
