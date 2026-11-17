import { HECTARES } from '~/src/features/common/constants/unit_type.js'
import {
  haToSqm,
  sqmToHaRounded
} from '~/src/features/common/helpers/measurement.js'
import { actionTransformer } from '~/src/features/parcel/transformers/2.0.0/parcelActions.transformer.js'

/**
 * An area quantity in square metres, from hectares or square metres.
 * @param {{quantity: number, unit: string}} selected - The quantity and its unit
 * @returns {number} The area in square metres
 */
const toSqm = ({ quantity, unit }) =>
  unit === HECTARES ? haToSqm(quantity) : quantity

/**
 * The supplements of a base action, each with its availability. A supplement
 * sits on top of its base, so it can cover all or part of the base action's
 * area. Like /parcels, this reports what is available rather than judging the
 * quantities selected: /application/validate checks those.
 * @param {object} params
 * @param {SelectedAction} params.baseAction - The selected base action and its area
 * @param {Action[]} params.supplementActions - The base action's enabled and displayed supplements, in display order
 * @returns {object[]} The supplements, shaped as the parcels endpoint shapes actions
 */
export function getSupplementsWithAvailability({
  baseAction,
  supplementActions
}) {
  const baseAreaSqm = toSqm(baseAction)
  const baseAreaCalculation = {
    availableAreaSqm: baseAreaSqm,
    availableAreaHectares: sqmToHaRounded(baseAreaSqm)
  }

  return supplementActions.map((supplement) =>
    actionTransformer(supplement, baseAreaCalculation)
  )
}

/**
 * @typedef {object} SelectedAction
 * @property {string} actionCode
 * @property {number} quantity
 * @property {string} unit
 */

/**
 * @import { Action } from '~/src/features/actions/action.d.js'
 */
