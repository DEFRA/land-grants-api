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
  const explanations = []
  let stackNumber = 0

  if (!Array.isArray(actions)) {
    throw new Error('Actions must be an array')
  }

  if (actions.length === 0) {
    return {
      explanations: ['No existing actions so no stacks are needed'],
      stacks: []
    }
  }

  // sort actions by area in ascending order
  // this ensures that smaller actions are considered first
  // which helps in filling stacks more efficiently
  const sortedActions = actions.sort((a, b) => {
    return a.area - b.area
  })

  for (const action of sortedActions) {
    let currentArea = action.area

    explanations.push(`Adding ${action.code} (area ${action.area})`)

    for (const stack of stacks) {
      if (
        areAllCodesCompatible(
          action.code,
          stack.actionCodes,
          compatibilityCheckFn
        )
      ) {
        explanations.push(
          `  ${action.code} is compatible with: ${stack.actionCodes.join(', ')} in Stack ${stack.stackNumber}`
        )

        if (currentArea >= stack.area) {
          stack.actionCodes.push(action.code)
          currentArea -= stack.area
          explanations.push(
            `  Added ${action.code} to Stack ${stack.stackNumber} with area ${stack.area}`
          )
        } else {
          splitStacks(action, currentArea, stack)

          currentArea = 0
          break
        }
      } else {
        explanations.push(
          `  ${action.code} is not compatible with all of: ${stack.actionCodes.join(', ')} in Stack ${stack.stackNumber}`
        )
      }
    }

    if (currentArea > 0) {
      const { stack: newStack, explanation } = createStack(
        [action.code],
        currentArea
      )
      stacks.push(newStack)
      explanations.push(explanation)
    }
  }

  return {
    explanations,
    stacks
  }

  function createStack(actionCodes, area) {
    stackNumber++
    return {
      stack: { stackNumber, actionCodes, area },
      explanation: `  Created Stack ${stackNumber} for ${actionCodes.join(', ')} with area ${area}`
    }
  }

  function splitStacks(action, currentArea, stack) {
    explanations.push(
      `  Remaining area of ${action.code} is ${currentArea}, this is less than the area of Stack ${stack.stackNumber} (${stack.area})`
    )

    const { stack: newStack, explanation: newStackExplanation } = createStack(
      [...stack.actionCodes],
      stack.area - currentArea
    )

    stacks.push(newStack)

    stack.actionCodes.push(action.code)
    stack.area = currentArea

    explanations.push(
      `  Reducing Stack ${stack.stackNumber} area to ${stack.area} and adding ${action.code} to it`
    )
    explanations.push(newStackExplanation)
  }
}
