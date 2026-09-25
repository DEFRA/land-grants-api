import { TOTAL } from '~/src/features/common/constants/action_availability.js'
import { HECTARES, METERS } from '~/src/features/common/constants/unit_type.js'
import {
  EXISTING_ACTIONS_DO_NOT_FIT,
  EXISTING_ACTIONS_DO_NOT_FIT_REASON
} from '~/src/features/parcel/constants/unavailable-reasons.js'
import { sizeTransformer } from '../parcelActions.transformer.js'

/**
 * Whatever availability calculation ran for an action's unit: the area result
 * for land, the length result for a boundary. Every field is optional because
 * which of them is present depends on which calculation ran.
 * @typedef {Partial<AvailableAreaForAction & AvailableLength>} ActionAvailability
 */

/**
 * Why an area action cannot be applied for. The figures let the RPA see how far
 * the recorded actions overrun the land they are recorded against.
 * @param {ActionAvailability} calculation - The infeasible area result
 * @returns {object} The unavailable reason
 */
function unavailableReasonTransformer({
  totalValidLandCoverSqm,
  existingActionsAreaSqm
}) {
  return {
    code: EXISTING_ACTIONS_DO_NOT_FIT,
    reason: EXISTING_ACTIONS_DO_NOT_FIT_REASON,
    metadata: { totalValidLandCoverSqm, existingActionsAreaSqm }
  }
}

/**
 * How much an action still has available, in whatever it is measured by: land
 * in hectares or square metres, or boundary in metres for a linear action.
 * @param {string} unit - The action's application unit of measurement
 * @param {ActionAvailability | null} calculation - The calculation that ran for it
 * @returns {number | undefined} The quantity still available
 */
function availableQuantity(unit, calculation) {
  if (unit === HECTARES) {
    return calculation?.availableAreaHectares
  }
  if (unit === METERS) {
    return calculation?.availableLength
  }
  return calculation?.availableAreaSqm
}

/**
 * Transform parcel and actions to land parcel and actions for v2
 * @param {Action} action - The actions to merge
 * @param {ActionAvailability | null} calculation - The availability calculation that ran for this action's unit
 * @param {boolean} showResults - Whether to include results
 * @returns {object} The land action data with available area
 */
function actionTransformer(action, calculation = null, showResults = false) {
  const unit = action.applicationUnitOfMeasurement
  const quantity = availableQuantity(unit, calculation)

  const availability =
    quantity !== undefined && Number.isFinite(quantity)
      ? sizeTransformer(quantity, unit)
      : { unit, value: null }

  // A count action runs no calculation at all and a length one reports no
  // feasibility, so only an explicit false means the land could not be arranged.
  const isAvailable = calculation?.feasible !== false

  const response = {
    code: action.code,
    description: action.description,
    version: action.semanticVersion,
    guidanceUrl: action.guidanceUrl ?? undefined,
    availability,
    isAvailable,
    unavailableReason: isAvailable
      ? undefined
      : unavailableReasonTransformer(calculation),
    quantityRequired: action?.availability?.type !== TOTAL,
    displayUnit: action?.displayUnit,
    displayUnitPlural: action?.displayUnitPlural,
    ...action.payment
  }

  if (showResults) {
    const { totalValidLandCoverSqm, stacks, explanations } = calculation ?? {}
    return {
      ...response,
      results: { totalValidLandCoverSqm, stacks, explanations }
    }
  }

  return response
}

export { actionTransformer }

/**
 * @import { AvailableAreaForAction } from "~/src/features/available-area/available-area.d.js"
 * @import { AvailableLength } from '~/src/features/available-length/available-length.d.js'
 * @import {Action} from '~/src/features/actions/action.d.js'
 */
