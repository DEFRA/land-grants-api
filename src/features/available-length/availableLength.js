import { METERS } from '~/src/features/common/constants/unit_type.js'
import {
  getUnitByActionCode,
  unitCompetedFor
} from '../common/helpers/action-unit.js'
import { lengthActionsTransformer } from '../parcel/transformers/parcelActions.transformer.js'

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
  const incompatibleActions = existingActions.filter(
    (existingAction) =>
      !compatibilityCheckFn(existingAction.actionCode, actionCode)
  )

  const incompatibleLengthMeters = incompatibleActions.reduce(
    (total, incompatibleAction) =>
      total + Math.round(incompatibleAction.billedLengthMeters),
    0
  )

  const availableLength = Math.max(
    0,
    boundaryLengthMeters - incompatibleLengthMeters
  )

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
 * @param {ActionRequest} action - The action
 * @param {Action[]} actions - All enabled actions
 * @param {AgreementAction[]} agreements - The agreements
 * @param {CompatibilityCheckFn} compatibilityCheckFn - Compatibility check function
 * @param {LandAction} landAction - The land action
 * @param {number} boundaryLengthMeters - The parcel's perimeter in metres
 * @returns {AvailableLength} The validation result
 */
export function getAvailableLength(
  action,
  actions,
  agreements,
  compatibilityCheckFn,
  landAction,
  boundaryLengthMeters
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

  return calculateAvailableLength(
    action.code,
    existingActions,
    compatibilityCheckFn,
    boundaryLengthMeters
  )
}

/**
 * @import { ActionRequest } from '~/src/features/application/application.d.js'
 * @import { Action } from '~/src/features/actions/action.d.js'
 * @import { AgreementAction } from '~/src/features/agreements/agreements.d.js'
 * @import { ActionWithLength, AvailableLength } from '~/src/features/available-length/available-length.d.js'
 * @import { CompatibilityCheckFn } from '~/src/features/available-area/available-area.d.js'
 * @import { LandAction } from '~/src/features/payment/payment.d.js'
 */
