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
 * The supplements of a base action that we offer (enabled and displayed, as
 * for hasSupplements on /parcels), in display order, each with its
 * availability. A supplement sits on top of its base, so it can cover all or
 * part of the base action's area. Like /parcels, this reports what is
 * available rather than judging the quantities selected: /application/validate
 * checks those.
 * @param {object} params
 * @param {string} params.baseActionCode - The selected base action
 * @param {SelectedAction[]} params.plannedActions - Every action selected on the parcel, the base action among them
 * @param {Action[]} params.enabledActions - The enabled actions, in display order
 * @param {Map<string, Set<string>>} params.baseCodesBySupplement - The base actions of each supplement
 * @returns {object[]} The supplements, shaped as the parcels endpoint shapes actions
 */
export function getSupplementsWithAvailability({
  baseActionCode,
  plannedActions,
  enabledActions,
  baseCodesBySupplement
}) {
  const supplementActions = enabledActions.filter(
    (action) =>
      action.display &&
      baseCodesBySupplement.get(action.code)?.has(baseActionCode)
  )
  const plannedBase = /** @type {SelectedAction} */ (
    plannedActions.find((planned) => planned.actionCode === baseActionCode)
  )

  const baseAreaSqm = toSqm(plannedBase)
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
 * @property {string} [baseActionCode] - For a supplement, the base action it sits on
 */

/**
 * @import { Action } from '~/src/features/actions/action.d.js'
 */
