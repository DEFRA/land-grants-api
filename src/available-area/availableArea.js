export function calculateAvailableArea(
  totalValidLandCover,
  existingActions,
  actionCodeAppliedFor,
  compatibilityCheckFn = () => false
) {
  let availableArea = totalValidLandCover

  existingActions.forEach((existingAction) => {
    if (!compatibilityCheckFn(actionCodeAppliedFor, existingAction.code))
      availableArea -= existingAction.area || 0
  })

  return availableArea
}
