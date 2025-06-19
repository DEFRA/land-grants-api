function areAllCodesCompatible(code, codes, fn) {
  for (const c of codes) {
    if (!fn(code, c)) return false
  }

  return true
}

export function createActionStacks(
  actions,
  compatibilityCheckFn = () => false
) {
  const stacks = []

  const sortedActions = actions.sort((a, b) => {
    return a.area - b.area
  })

  for (const action of sortedActions) {
    let currentArea = action.area

    for (const stack of stacks) {
      if (
        areAllCodesCompatible(
          action.code,
          stack.actionCodes,
          compatibilityCheckFn
        )
      ) {
        stack.actionCodes.push(action.code)
        currentArea -= stack.area
      }
    }

    if (currentArea > 0) {
      stacks.push({ actionCodes: [action.code], area: currentArea })
    }
  }

  return stacks
}
