function allActionCodesAreCompatible(code, codes, compatibilityCheckFn) {
  return codes.every((c) => compatibilityCheckFn(c, code))
}

function validateInputParams(
  actionCodeAppliedFor,
  totalValidLandCoverSqm,
  stacks,
  compatibilityCheckFn
) {
  if (!actionCodeAppliedFor) {
    throw new Error('Action code applied for should have a value')
  }

  if (typeof totalValidLandCoverSqm !== 'number') {
    throw new Error('Total valid land cover must be a number')
  }

  if (!Array.isArray(stacks)) {
    throw new Error('Stacks must be an array')
  }

  if (typeof compatibilityCheckFn !== 'function') {
    throw new Error('Compatibility check function must be a function')
  }
}

export function subtractIncompatibleStacks(
  actionCodeAppliedFor,
  totalValidLandCoverSqm,
  stacks,
  compatibilityCheckFn
) {
  validateInputParams(
    actionCodeAppliedFor,
    totalValidLandCoverSqm,
    stacks,
    compatibilityCheckFn
  )

  const incompatibleStacks = stacks.filter(
    (stack) =>
      !allActionCodesAreCompatible(
        actionCodeAppliedFor,
        stack.actionCodes,
        compatibilityCheckFn
      )
  )

  return incompatibleStacks.reduce(
    (acc, stack) => acc - stack.areaSqm,
    totalValidLandCoverSqm
  )
}
