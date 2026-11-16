import { HECTARES } from '~/src/features/common/constants/unit_type.js'
import {
  haToSqm,
  sqmToHaRounded
} from '~/src/features/common/helpers/measurement.js'
import {
  EXCEEDS_BASE_ACTION_AREA,
  EXCEEDS_BASE_ACTION_AREA_REASON
} from '~/src/features/parcel/constants/unavailable-reasons.js'
import { actionTransformer } from '~/src/features/parcel/transformers/2.0.0/parcelActions.transformer.js'

/**
 * An area quantity in square metres, from hectares or square metres.
 * @param {{quantity: number, unit: string}} selected - The quantity and its unit
 * @returns {number} The area in square metres
 */
const toSqm = ({ quantity, unit }) =>
  unit === HECTARES ? haToSqm(quantity) : quantity

/**
 * Why a selected supplement asks for more than its base action covers.
 * @param {SelectedAction | undefined} selected - The supplement as selected, if it is
 * @param {SelectedAction} baseAction - The base action
 * @returns {UnavailableReasonResult | undefined} The reason, or undefined when it fits
 */
const exceedsBaseActionAreaReason = (selected, baseAction) => {
  if (!selected || toSqm(selected) <= toSqm(baseAction)) {
    return undefined
  }

  return {
    code: EXCEEDS_BASE_ACTION_AREA,
    reason: EXCEEDS_BASE_ACTION_AREA_REASON,
    metadata: {
      baseActionCode: baseAction.actionCode,
      baseActionAreaHa: sqmToHaRounded(toSqm(baseAction)),
      selectedAreaHa: sqmToHaRounded(toSqm(selected))
    }
  }
}

/**
 * The supplements of a base action, each with its availability. A supplement
 * sits on top of its base, so it can cover all or part of the base action's
 * area. A selected supplement is unavailable when it is selected for more than
 * the base covers. Selected supplements do not yet reduce each other's
 * availability: those that cannot overlap still share the base action's area.
 * @param {object} params
 * @param {SelectedAction} params.baseAction - The selected base action and its area
 * @param {SelectedAction[]} params.selectedSupplements - The supplements selected so far
 * @param {Action[]} params.supplementActions - The base action's enabled and displayed supplements, in display order
 * @returns {object[]} The supplements, shaped as the parcels endpoint shapes actions
 */
export function getSupplementsWithAvailability({
  baseAction,
  selectedSupplements,
  supplementActions
}) {
  const baseAreaSqm = toSqm(baseAction)
  const baseAreaCalculation = {
    availableAreaSqm: baseAreaSqm,
    availableAreaHectares: sqmToHaRounded(baseAreaSqm)
  }

  return supplementActions.map((supplement) => {
    const selected = selectedSupplements.find(
      (s) => s.actionCode === supplement.code
    )

    return actionTransformer(supplement, {
      ...baseAreaCalculation,
      unavailableReason: exceedsBaseActionAreaReason(selected, baseAction)
    })
  })
}

/**
 * @typedef {object} SelectedAction
 * @property {string} actionCode
 * @property {number} quantity
 * @property {string} unit
 */

/**
 * @import { Action } from '~/src/features/actions/action.d.js'
 * @import { UnavailableReasonResult } from '~/src/features/parcel/unavailability.d.js'
 */
