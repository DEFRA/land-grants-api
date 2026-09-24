import { TOTAL } from '~/src/features/common/constants/action_availability.js'
import { HECTARES } from '~/src/features/common/constants/unit_type.js'
import {
  EXISTING_ACTIONS_DO_NOT_FIT,
  EXISTING_ACTIONS_DO_NOT_FIT_REASON
} from '~/src/features/parcel/constants/unavailable-reasons.js'
import { sizeTransformer } from '../parcelActions.transformer.js'

/**
 * Why an area action cannot be applied for. The figures let the RPA see how far
 * the recorded actions overrun the land they are recorded against.
 * @param {AvailableAreaForAction} availableArea - The infeasible area result
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
 * Transform parcel and actions to land parcel and actions for v2
 * @param {Action} action - The actions to merge
 * @param {AvailableAreaForAction | null} availableArea - Total Available Area
 * @param {boolean} showResults - Whether to include results
 * @returns {object} The land action data with available area
 */
function actionTransformer(action, availableArea = null, showResults = false) {
  const unit = action.applicationUnitOfMeasurement
  const areaValue =
    unit === HECTARES
      ? availableArea?.availableAreaHectares
      : availableArea?.availableAreaSqm

  const aa = Number.isFinite(areaValue)
    ? sizeTransformer(areaValue ?? 0, unit)
    : undefined

  const availability = { unit, value: null, ...aa }

  // Absent for count and linear actions, which run no area calculation at all,
  // so only an explicit false means the land could not be arranged.
  const isAvailable = availableArea?.feasible !== false

  const response = {
    code: action.code,
    description: action.description,
    version: action.semanticVersion,
    guidanceUrl: action.guidanceUrl ?? undefined,
    availability,
    isAvailable,
    unavailableReason: isAvailable
      ? undefined
      : unavailableReasonTransformer(availableArea),
    quantityRequired: action?.availability?.type !== TOTAL,
    displayUnit: action?.displayUnit,
    displayUnitPlural: action?.displayUnitPlural,
    ...action.payment
  }

  if (showResults) {
    return {
      ...response,
      results: {
        totalValidLandCoverSqm: availableArea?.totalValidLandCoverSqm,
        stacks: availableArea?.stacks,
        explanations: availableArea?.explanations
      }
    }
  }

  return response
}

export { actionTransformer }

/**
 * @import { AvailableAreaForAction } from "~/src/features/available-area/available-area.d.js"
 * @import {Action} from '~/src/features/actions/action.d.js'
 */
