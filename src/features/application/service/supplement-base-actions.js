import { listOf } from '~/src/features/common/helpers/list-of.js'
import { sqmToHaRounded } from '~/src/features/common/helpers/measurement.js'
import { otherAreaActionsOnParcel } from './get-available-area.js'

/**
 * A supplement's base actions, from the compatibility matrix, and those of them
 * applied for on the same parcel in the same application. Agreements don't count:
 * the base action has to be applied for alongside the supplement.
 * @param {Pick<ActionRequest, 'code'>} action - The supplement applied for
 * @param {Omit<LandAction, 'sbi'>} landAction - The parcel and every action applied for on it
 * @param {Action[]} actions - All enabled actions
 * @param {Map<string, Set<string>>} baseCodesBySupplement - The base actions of each supplement
 * @returns {SupplementBaseActions} Its base actions
 */
export const getSupplementBaseActions = (
  action,
  landAction,
  actions,
  baseCodesBySupplement
) => {
  const baseCodes = [...(baseCodesBySupplement.get(action.code) ?? [])]
  // Name only the base actions we offer, unless we offer none of them
  const enabledBaseCodes = baseCodes.filter((code) =>
    actions.some((a) => a.code === code)
  )

  return {
    baseCodes: enabledBaseCodes.length > 0 ? enabledBaseCodes : baseCodes,
    // The other actions on the parcel, as its available area calculation is given them
    onParcel: otherAreaActionsOnParcel(action, landAction, actions).filter(
      (other) => baseCodes.includes(other.actionCode)
    )
  }
}

/**
 * A supplement can cover no more land than its base actions applied for on the parcel,
 * so cap its available area at theirs.
 * With none on the parcel, that area is 0.
 * The section added to the explanations says why.
 * @param {AvailableArea} availableArea - What the parcel leaves the supplement
 * @param {string} code - The supplement
 * @param {SupplementBaseActions} supplementBaseActions - Its base actions
 * @returns {AvailableArea} The smaller of the two
 */
export const capSupplementAtBaseActions = (
  availableArea,
  code,
  { baseCodes, onParcel }
) => {
  // A supplement with several of its base actions on the parcel can use them all
  const totalBaseAreaSqm = onParcel.reduce(
    (total, base) => total + base.areaSqm,
    0
  )
  const availableAreaSqm = Math.min(
    availableArea.availableAreaSqm,
    totalBaseAreaSqm
  )
  const isCapped = availableAreaSqm < availableArea.availableAreaSqm
  const baseCodesOnParcel = [
    ...new Set(onParcel.map((base) => base.actionCode))
  ]

  let baseActionLine
  if (onParcel.length > 0) {
    baseActionLine = `${code} is a supplement of ${listOf(baseCodesOnParcel, 'and')}, applied for on ${sqmToHaRounded(totalBaseAreaSqm)} ha of this land parcel.`
  } else if (baseCodes.length === 1) {
    baseActionLine = `${code} is a supplement of ${baseCodes[0]}, which is not applied for on this land parcel in this application.`
  } else {
    baseActionLine = `${code} is a supplement of ${listOf(baseCodes, 'or')}, none of which is applied for on this land parcel in this application.`
  }

  return {
    ...availableArea,
    availableAreaSqm,
    availableAreaHectares: sqmToHaRounded(availableAreaSqm),
    explanations: [
      ...(availableArea.explanations ?? []),
      {
        title: 'Base action',
        content: isCapped
          ? [
              baseActionLine,
              `Its available area is capped at that of its base action: ${sqmToHaRounded(availableAreaSqm)} ha.`
            ]
          : [baseActionLine]
      }
    ]
  }
}

/**
 * @typedef {{ availableAreaSqm: number, availableAreaHectares?: number, explanations?: object[] }} AvailableArea
 */

/**
 * @typedef {object} SupplementBaseActions
 * @property {string[]} baseCodes - The codes of its base actions
 * @property {{ actionCode: string, areaSqm: number }[]} onParcel - Its base actions applied for on the parcel
 */

/**
 * @import { ActionRequest } from '~/src/features/application/application.d.js'
 * @import { Action } from '~/src/features/actions/action.d.js'
 * @import { LandAction } from '~/src/features/payment/payment.d.js'
 */
