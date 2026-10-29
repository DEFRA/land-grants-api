import { METERS } from '~/src/features/common/constants/unit_type.js'
import {
  getUnitByActionCode,
  unitCompetedFor
} from '../common/helpers/action-unit.js'
import { lengthActionsTransformer } from '../parcel/transformers/parcelActions.transformer.js'
import { getLandParcelBoundary } from '../parcel/queries/getParcelBoundary.query.js'
import { getSidednessByActionCode } from '../actions/queries/getSidednessByActionCode.query.js'
import {
  billingFactorOf,
  sidednessOf
} from '~/src/features/common/constants/sidedness.js'
import { findMinimumBoundary, incompatibleWith } from './minimumBoundary.js'

/**
 * An existing action with its sidedness and the metres of boundary it
 * occupies, rounded up so a part metre of boundary is never offered.
 * @param {ActionWithLength} existingAction - The existing action
 * @param {SidednessByActionCode} sidednessByActionCode - The sidedness of the codes involved
 * @returns {Occupancy} The action and the boundary it occupies
 */
const occupancyOf = (existingAction, sidednessByActionCode) => {
  const { actionCode, billedLengthMeters } = existingAction

  const sidedness = sidednessOf(actionCode, sidednessByActionCode)
  const occupiedMeters = Math.ceil(
    billedLengthMeters / billingFactorOf(sidedness)
  )

  return { actionCode, billedLengthMeters, sidedness, occupiedMeters }
}

/**
 * @param {Occupancy[]} occupancies - The boundary each existing action occupies
 * @param {number} boundaryLengthMeters - The parcel's perimeter in whole metres
 * @param {CompatibilityCheckFn} compatibilityCheckFn - Whether two actions can share a stretch of boundary
 * @returns {boolean} Whether the actions can all fit the boundary
 */
const fitWithin = (occupancies, boundaryLengthMeters, compatibilityCheckFn) => {
  const minimumBoundary = findMinimumBoundary(occupancies, compatibilityCheckFn)

  return minimumBoundary.meters <= boundaryLengthMeters
}

/**
 * @param {string} actionCode - The action code being applied for
 * @param {Occupancy[]} existingOccupancies - The boundary each existing action occupies
 * @param {{feasible: boolean, compatibilityCheckFn: CompatibilityCheckFn}} context - Whether the existing actions all fit, and whether two actions can share a stretch
 * @returns {{actions: Occupancy[], meters: number}} The minimum boundary of the actions incompatible with the one applied for
 */
const findMinimumIncompatibleBoundary = (
  actionCode,
  existingOccupancies,
  { feasible, compatibilityCheckFn }
) => {
  // When they cannot all fit, every existing action is reported as incompatible, so the reason names the ones that do not fit
  const incompatibleOccupancies = feasible
    ? incompatibleWith(actionCode, existingOccupancies, compatibilityCheckFn)
    : existingOccupancies

  return findMinimumBoundary(incompatibleOccupancies, compatibilityCheckFn)
}

/**
 * @param {Sidedness} targetSidedness - The sidedness of the action applied for
 * @param {number} boundaryLengthMeters - The parcel's perimeter in whole metres
 * @param {number} incompatibleLengthMeters - The boundary taken by incompatible actions
 * @returns {number} The free boundary, billed at the applied-for action's rate
 */
const availableLengthFor = (
  targetSidedness,
  boundaryLengthMeters,
  incompatibleLengthMeters
) => {
  const availableBoundaryMeters = Math.max(
    0,
    boundaryLengthMeters - incompatibleLengthMeters
  )

  return availableBoundaryMeters * billingFactorOf(targetSidedness)
}

/**
 * Deducts the physical boundary occupied by incompatible actions from a
 * parcel's perimeter, and bills what is left at the applied-for action's rate.
 * Incompatible actions that can share a stretch with each other are deducted
 * once. When the existing actions cannot all fit the boundary, nothing is
 * available. Takes lengths that callers have gathered and filtered to metres.
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
  const existingOccupancies = existingActions.map((existingAction) =>
    occupancyOf(existingAction, sidednessByActionCode)
  )

  const feasible = fitWithin(
    existingOccupancies,
    boundaryLengthMeters,
    compatibilityCheckFn
  )

  const minimumIncompatibleBoundary = findMinimumIncompatibleBoundary(
    actionCode,
    existingOccupancies,
    { feasible, compatibilityCheckFn }
  )

  const incompatibleLengthMeters = minimumIncompatibleBoundary.meters

  const availableLength = availableLengthFor(
    sidednessOf(actionCode, sidednessByActionCode),
    boundaryLengthMeters,
    incompatibleLengthMeters
  )

  const incompatibleActions = minimumIncompatibleBoundary.actions.map(
    ({ actionCode: code, billedLengthMeters }) => ({
      actionCode: code,
      billedLengthMeters
    })
  )

  const explainedOccupancies = existingOccupancies.map((existingOccupancy) => ({
    ...existingOccupancy,
    deducted: minimumIncompatibleBoundary.actions.includes(existingOccupancy)
  }))

  return {
    availableLength,
    boundaryLengthMeters,
    incompatibleLengthMeters,
    incompatibleActions,
    feasible,
    explainedOccupancies
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
 * @import { ActionWithLength, AvailableLength, BoundaryContext, Occupancy, Sidedness, SidednessByActionCode } from '~/src/features/available-length/available-length.d.js'
 * @import { CompatibilityCheckFn } from '~/src/features/available-area/available-area.d.js'
 * @import { LandAction } from '~/src/features/payment/payment.d.js'
 */
