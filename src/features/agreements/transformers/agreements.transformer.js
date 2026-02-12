/**
 * Transforms actions from DB format to AgreementAction format.
 * @param {object[]} agreements - The agreements to transform.
 * @returns {AgreementAction[]} The transformed agreement actions.
 */
function agreementActionsTransformer(agreements) {
  if (!agreements || agreements.length === 0) {
    return []
  }

  return agreements[0].actions?.map((action) => {
    return {
      actionCode: action.actionCode,
      quantity: action.quantity,
      unit: action.unit,
      startDate: new Date(action.startDate),
      endDate: new Date(action.endDate)
    }
  })
}

/**
 *
 * @param {AgreementAction[]} agreementActions
 * @param {AgreementAction[]} plannedActions
 * @returns {AgreementAction[]}
 */
function mergeAgreementsTransformer(agreementActions, plannedActions) {
  return [...(agreementActions || []), ...(plannedActions || [])]
}

export { agreementActionsTransformer, mergeAgreementsTransformer }

/**
 * @import { AgreementAction } from "../agreements.d.js"
 */
