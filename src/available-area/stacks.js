/**
 * Checks if a code is compatible with all codes in a list using a provided function.
 * @param {string} code
 * @param {string[]} codes
 * @param {Function} compareFn
 * @returns {boolean}
 */
function areAllCodesCompatible(code, codes, compareFn) {
  for (const c of codes) {
    if (!compareFn(code, c)) return false
  }

  return true
}

const explain = {
  allCodesCompatible: (action, existingStack) =>
    `  ${action.code} is compatible with: ${existingStack.actionCodes.join(', ')} in Stack ${existingStack.stackNumber}`,
  allCodesNotCompatible: (action, existingStack) =>
    `  ${action.code} is not compatible with all of: ${existingStack.actionCodes.join(', ')} in Stack ${existingStack.stackNumber}`,
  addedToStack: (action, existingStack) =>
    `  Added ${action.code} to Stack ${existingStack.stackNumber} with area ${existingStack.area}`,
  remainingAreaLessThanStack: (action, currentArea, stack) =>
    `  Remaining area of ${action.code} is ${currentArea}, this is less than the area of Stack ${stack.stackNumber} (${stack.area}), split needed`,
  stackCreated: (stackNumber, actionCodes, area) =>
    `  Created Stack ${stackNumber} for ${actionCodes.join(', ')} with area ${area}`,
  shrinkStack: (stack, action) =>
    `  Shrinking Stack ${stack.stackNumber} area to ${stack.area} and adding ${action.code} to it`
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
    let remainingAreaForAction = action.area

    explanations.push(`Adding ${action.code} (area ${action.area})`)

    for (const existingStack of stacks) {
      const actionIsCompatibleWithAllActionsInExistingStack =
        areAllCodesCompatible(
          action.code,
          existingStack.actionCodes,
          compatibilityCheckFn
        )

      if (actionIsCompatibleWithAllActionsInExistingStack) {
        explanations.push(explain.allCodesCompatible(action, existingStack))

        if (remainingAreaForAction >= existingStack.area) {
          existingStack.actionCodes.push(action.code)
          remainingAreaForAction -= existingStack.area
          explanations.push(explain.addedToStack(action, existingStack))
        } else {
          splitStacks(action, remainingAreaForAction, existingStack)

          remainingAreaForAction = 0
          break
        }
      } else {
        explanations.push(explain.allCodesNotCompatible(action, existingStack))
      }
    }

    const currentActionHasAreaNotAssignedToAnyStack = remainingAreaForAction > 0

    if (currentActionHasAreaNotAssignedToAnyStack) {
      const { stack: newStack, explanation } = createStack(
        [action.code],
        remainingAreaForAction
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
      explanation: explain.stackCreated(stackNumber, actionCodes, area)
    }
  }

  function splitStacks(action, currentArea, stack) {
    explanations.push(
      explain.remainingAreaLessThanStack(action, currentArea, stack)
    )

    const { stack: newStack, explanation: newStackExplanation } = createStack(
      [...stack.actionCodes],
      stack.area - currentArea
    )

    stacks.push(newStack)

    stack.actionCodes.push(action.code)
    stack.area = currentArea

    explanations.push(explain.shrinkStack(stack, action))
    explanations.push(newStackExplanation)
  }
}
