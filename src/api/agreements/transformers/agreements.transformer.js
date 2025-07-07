function agreementActionsTransformer(agreements) {
  if (!agreements || agreements.length === 0) {
    return []
  }

  return agreements.flatMap((agreement) => {
    return agreement.actions.map((action) => {
      return {
        code: action.action_code,
        areaSqm: action.quantity,
        unit: action.unit
      }
    })
  })
}

function mergeAgreementsTransformer(agreementActions, existingActions) {
  const actions = agreementActionsTransformer(agreementActions)
  return [...(actions || []), ...(existingActions || [])]
}

export { agreementActionsTransformer, mergeAgreementsTransformer }
