const formatSqmToHa = (value) => `${value / 10000} ha`

function makeCreateStack() {
  let stackNumber = 0
  function createStack(actionCodes, areaSqm) {
    stackNumber++
    return {
      stack: { stackNumber, actionCodes, areaSqm },
      explanation: explain.stackCreated(stackNumber, actionCodes, areaSqm)
    }
  }
  return createStack
}

function splitStacks(
  createStack,
  stacks,
  explanations,
  action,
  remainingAreaForAction
) {
  const newStacks = [...stacks]
  const currentStack = newStacks.pop()

  const newExplanations = [...explanations]
  newExplanations.push(
    explain.remainingAreaLessThanStack(
      action,
      remainingAreaForAction,
      currentStack
    )
  )

  const { stack: newStack, explanation: newStackExplanation } = createStack(
    [...currentStack.actionCodes],
    currentStack.areaSqm - remainingAreaForAction
  )

  currentStack.actionCodes.push(action.code)
  currentStack.areaSqm = remainingAreaForAction

  newStacks.push(currentStack)
  newStacks.push(newStack)

  newExplanations.push(explain.shrinkStack(currentStack, action))
  newExplanations.push(newStackExplanation)

  return { newExplanations, newStacks }
}

function checkCompatibility(action, stack, explanations, compatibilityCheckFn) {
  const newExplanations = [...explanations]
  const compatibleCodes = []
  const incompatibleCodes = []

  for (const code of stack.actionCodes) {
    if (compatibilityCheckFn(action.code, code)) {
      compatibleCodes.push(code)
    } else {
      incompatibleCodes.push(code)
    }
  }

  if (compatibleCodes.length > 0) {
    newExplanations.push(
      explain.compatible(action.code, compatibleCodes, stack.stackNumber)
    )
  }

  if (incompatibleCodes.length > 0) {
    newExplanations.push(
      explain.notCompatible(action.code, incompatibleCodes, stack.stackNumber)
    )
  }

  return {
    allCompatible: incompatibleCodes.length === 0,
    newExplanations
  }
}

const explain = {
  noStacksNeeded: () => `No existing actions so no stacks are needed`,
  addingAction: (action) =>
    `Adding ${action.code} (area ${formatSqmToHa(action.areaSqm)})`,
  allCodesCompatible: (action, existingStack) =>
    `  ${action.code} is compatible with: ${existingStack.actionCodes.join(', ')} in Stack ${existingStack.stackNumber}`,
  allCodesNotCompatible: (action, existingStack) =>
    `  ${action.code} is not compatible with all of: ${existingStack.actionCodes.join(', ')} in Stack ${existingStack.stackNumber}`,
  addedToStack: (action, existingStack) =>
    `  Added ${action.code} to Stack ${existingStack.stackNumber} with area ${formatSqmToHa(existingStack.areaSqm)}`,
  remainingAreaLessThanStack: (action, currentArea, stack) =>
    `  Remaining area of ${action.code} is ${formatSqmToHa(currentArea)}, this is less than the area of Stack ${stack.stackNumber} (${formatSqmToHa(stack.areaSqm)}), split needed`,
  stackCreated: (stackNumber, actionCodes, areaSqm) =>
    `  Created Stack ${stackNumber} for ${actionCodes.join(', ')} with area ${formatSqmToHa(areaSqm)}`,
  shrinkStack: (stack, action) =>
    `  Shrinking Stack ${stack.stackNumber} area to ${formatSqmToHa(stack.areaSqm)} and adding ${action.code} to it`,
  notCompatible: (code, incompatibleCodes, stackNumber) =>
    `  ${code} is not compatible with: ${incompatibleCodes.join(', ')} in Stack ${stackNumber}`,
  compatible: (code, compatibleCodes, stackNumber) =>
    `  ${code} is compatible with: ${compatibleCodes.join(', ')} in Stack ${stackNumber}`
}

export function createActionStacks(
  actions,
  compatibilityCheckFn = () => false
) {
  let stacks = []
  let explanations = []
  const createStack = makeCreateStack()

  if (!Array.isArray(actions)) {
    throw new Error('Actions must be an array')
  }

  if (actions.length === 0) {
    return {
      explanations: [explain.noStacksNeeded()],
      stacks: []
    }
  }

  // sort actions by area in ascending order
  // this ensures that smaller actions are considered first
  // which helps in filling stacks more efficiently
  const sortedActionsAsc = actions.sort((a, b) => a.areaSqm - b.areaSqm)

  for (const action of sortedActionsAsc) {
    let remainingAreaForAction = action.areaSqm

    explanations.push(explain.addingAction(action))

    for (const existingStack of stacks) {
      const compatibility = checkCompatibility(
        action,
        existingStack,
        explanations,
        compatibilityCheckFn
      )

      const actionIsCompatibleWithAllActionsInExistingStack =
        compatibility.allCompatible

      explanations = compatibility.newExplanations

      if (!actionIsCompatibleWithAllActionsInExistingStack) {
        continue
      }

      if (remainingAreaForAction >= existingStack.areaSqm) {
        existingStack.actionCodes.push(action.code)
        remainingAreaForAction -= existingStack.areaSqm
        explanations.push(explain.addedToStack(action, existingStack))
      } else {
        const { newExplanations, newStacks } = splitStacks(
          createStack,
          stacks,
          explanations,
          action,
          remainingAreaForAction
        )

        explanations = newExplanations
        stacks = newStacks

        remainingAreaForAction = 0
        break
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
}
