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
 * @typedef {object} SupplementBaseActions
 * @property {string[]} baseCodes - The codes of its base actions
 * @property {{ actionCode: string, areaSqm: number }[]} onParcel - Its base actions applied for on the parcel
 */

/**
 * @import { ActionRequest } from '~/src/features/application/application.d.js'
 * @import { Action } from '~/src/features/actions/action.d.js'
 * @import { LandAction } from '~/src/features/payment/payment.d.js'
 */
