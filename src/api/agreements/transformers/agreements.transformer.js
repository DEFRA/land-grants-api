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
      actionCode: action.action_code,
      quantity: action.quantity,
      unit: action.unit,
      startDate: action.start_date ? new Date(action.start_date) : null,
      endDate: action.end_date ? new Date(action.end_date) : null
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
