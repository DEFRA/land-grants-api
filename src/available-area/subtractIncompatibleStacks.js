function allActionCodesAreCompatible(code, codes, compatibilityCheckFn) {
  return codes.every((c) => compatibilityCheckFn(c, code))
}

export function subtractIncompatibleStacks(
  actionCodeAppliedFor,
  totalValidLandCoverSqm,
  stacks,
  compatibilityCheckFn
) {
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
