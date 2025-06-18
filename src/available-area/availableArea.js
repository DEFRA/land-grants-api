export function calculateAvailableArea(
  totalValidLandCover,
  actionsOnParcel,
  actionCodeAppliedFor,
  compatibilityCheckFn = () => false
) {
  let availableArea = totalValidLandCover
  const sortedActionsOnParcelByAreaDesc = actionsOnParcel.sort(
    (a, b) => b.area - a.area
  )
  const groups = [
    {
      actions: ['CMOR1', 'UPL1'],
      area: 78.2
    },
    {
      actions: ['CMOR1'],
      area: 100.5
    }
  ]

  for (const action of sortedActionsOnParcelByAreaDesc) {
    // Check if the action is compatible with all the actions within a group
    const existingCompatibleGroupIndex = groups.findIndex((group) =>
      group.actions.every((existingActionCode) => {
        return compatibilityCheckFn(action, existingActionCode)
      })
    )

    if (existingCompatibleGroupIndex > -1) {
      groups[existingCompatibleGroupIndex].actions.push(action.code)
      // groups[existingCompatibleGroupIndex].area += action.area || 0
    }

    groups.push({
      actions: [action.code],
      area: action.area
    })
  }

  for (const existingAction of actionsOnParcel) {
    if (!compatibilityCheckFn(actionCodeAppliedFor, existingAction.code)) {
      availableArea -= existingAction.area || 0
    }
  }

  return availableArea
}
