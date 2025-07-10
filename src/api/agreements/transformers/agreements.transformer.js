function agreementActionsTransformer(agreements) {
  if (!agreements || agreements.length === 0) {
    return []
  }

  return agreements.flatMap((agreement) => {
    return agreement.actions.map((action) => {
      return {
        code: action.action_code,
        quantity: action.quantity,
        unit: action.unit
      }
    })
  })
}

function mergeAgreementsTransformer(agreementActions, plannedActions) {
  return [...(agreementActions || []), ...(plannedActions || [])]
}

export { agreementActionsTransformer, mergeAgreementsTransformer }
