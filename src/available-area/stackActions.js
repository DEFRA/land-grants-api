/**
 * Converts square meters to hectares and formats as a string
 * @param {number} value - Area in square meters
 * @returns {string} Formatted string with area in hectares
 */
const formatSqmToHa = (value) => `${value / 10000} ha`

/**
 * Creates a factory function for creating stacks with incrementing stack numbers
 * @returns {Function} A createStack function that maintains stack numbering
 */
function makeCreateStack() {
  let stackNumber = 0

  /**
   * Creates a new stack with action codes and area
   * @param {string[]} actionCodes - Array of action codes for this stack
   * @param {number} areaSqm - Area of the stack in square meters
   * @returns {{stack: {stackNumber: number, actionCodes: string[], areaSqm: number}, explanation: string}} object containing the stack and explanation
   */
  function createStack(actionCodes, areaSqm) {
    stackNumber++
    return {
      stack: { stackNumber, actionCodes, areaSqm },
      explanation: explain.stackCreated(stackNumber, actionCodes, areaSqm)
    }
  }
  return createStack
}

/**
 * Splits the last item of stacks into two new stacks, allocating the area in remainingAreaForAction within the two
 * @param {Function} createStack - Factory function for creating new stacks
 * @param {object[]} stacks - Array of existing stacks
 * @param {string[]} explanations - Array of explanation strings
 * @param {object} action - The action being processed
 * @param {string} action.code - Action code identifier
 * @param {number} action.areaSqm - Area of the action in square meters
 * @param {number} remainingAreaForAction - Remaining area to be allocated for the action
 * @returns {{newExplanations: string[], newStacks: object[]}} object containing updated explanations and stacks
 */
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

/**
 * Checks compatibility between an action and all actions in a stack, based on a compatibility check function
 * @param {object} action - The action to check compatibility for
 * @param {string} action.code - Action code identifier
 * @param {number} action.areaSqm - Area of the action in square meters
 * @param {object} stack - The stack to check against
 * @param {string[]} stack.actionCodes - Array of action codes in the stack
 * @param {number} stack.stackNumber - Stack identifier number
 * @param {string[]} explanations - Current array of explanations
 * @param {Function} compatibilityCheckFn - Function to check if two action codes are compatible
 * @returns {{allCompatible: boolean, newExplanations: string[]}} Compatibility check results
 */
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

/**
 * Explanation message generators for stack operations
 */
const explain = {
  /**
   * Generates explanation when no stacks are needed
   * @returns {string} Explanation message
   */
  noStacksNeeded: () => `No existing actions so no stacks are needed`,

  /**
   * Generates explanation when adding an action
   * @param {object} action - Action being added
   * @param {string} action.code - Action code
   * @param {number} action.areaSqm - Action area in square meters
   * @returns {string} Explanation message
   */
  addingAction: (action) =>
    `Adding ${action.code} (area ${formatSqmToHa(action.areaSqm)})`,

  /**
   * Generates explanation when action is compatible with all codes in a stack
   * @param {object} action - Action being checked
   * @param {string} action.code - Action code
   * @param {object} existingStack - Stack being checked against
   * @param {string[]} existingStack.actionCodes - Action codes in the stack
   * @param {number} existingStack.stackNumber - Stack identifier
   * @returns {string} Explanation message
   */
  allCodesCompatible: (action, existingStack) =>
    `  ${action.code} is compatible with: ${existingStack.actionCodes.join(', ')} in Stack ${existingStack.stackNumber}`,

  /**
   * Generates explanation when action is not compatible with all codes in a stack
   * @param {object} action - Action being checked
   * @param {string} action.code - Action code
   * @param {object} existingStack - Stack being checked against
   * @param {string[]} existingStack.actionCodes - Action codes in the stack
   * @param {number} existingStack.stackNumber - Stack identifier
   * @returns {string} Explanation message
   */
  allCodesNotCompatible: (action, existingStack) =>
    `  ${action.code} is not compatible with all of: ${existingStack.actionCodes.join(', ')} in Stack ${existingStack.stackNumber}`,

  /**
   * Generates explanation when action is added to an existing stack
   * @param {object} action - Action being added
   * @param {string} action.code - Action code
   * @param {object} existingStack - Stack the action was added to
   * @param {number} existingStack.stackNumber - Stack identifier
   * @param {number} existingStack.areaSqm - Stack area in square meters
   * @returns {string} Explanation message
   */
  addedToStack: (action, existingStack) =>
    `  Added ${action.code} to Stack ${existingStack.stackNumber} with area ${formatSqmToHa(existingStack.areaSqm)}`,

  /**
   * Generates explanation when remaining area is less than stack area, requiring split
   * @param {object} action - Action being processed
   * @param {string} action.code - Action code
   * @param {number} currentArea - Remaining area for the action
   * @param {object} stack - Stack that needs to be split
   * @param {number} stack.stackNumber - Stack identifier
   * @param {number} stack.areaSqm - Stack area in square meters
   * @returns {string} Explanation message
   */
  remainingAreaLessThanStack: (action, currentArea, stack) =>
    `  Remaining area of ${action.code} is ${formatSqmToHa(currentArea)}, this is less than the area of Stack ${stack.stackNumber} (${formatSqmToHa(stack.areaSqm)}), split needed`,

  /**
   * Generates explanation when a new stack is created
   * @param {number} stackNumber - Unique stack identifier
   * @param {string[]} actionCodes - Action codes in the new stack
   * @param {number} areaSqm - Area of the new stack in square meters
   * @returns {string} Explanation message
   */
  stackCreated: (stackNumber, actionCodes, areaSqm) =>
    `  Created Stack ${stackNumber} for ${actionCodes.join(', ')} with area ${formatSqmToHa(areaSqm)}`,

  /**
   * Generates explanation when a stack is shrunk and an action is added
   * @param {object} stack - Stack being shrunk
   * @param {number} stack.stackNumber - Stack identifier
   * @param {number} stack.areaSqm - New area of the stack after shrinking
   * @param {object} action - Action being added
   * @param {string} action.code - Action code
   * @returns {string} Explanation message
   */
  shrinkStack: (stack, action) =>
    `  Shrinking Stack ${stack.stackNumber} area to ${formatSqmToHa(stack.areaSqm)} and adding ${action.code} to it`,

  /**
   * Generates explanation for incompatible action codes
   * @param {string} code - Action code being checked
   * @param {string[]} incompatibleCodes - Array of incompatible action codes
   * @param {number} stackNumber - Stack identifier
   * @returns {string} Explanation message
   */
  notCompatible: (code, incompatibleCodes, stackNumber) =>
    `  ${code} is not compatible with: ${incompatibleCodes.join(', ')} in Stack ${stackNumber}`,

  /**
   * Generates explanation for compatible action codes
   * @param {string} code - Action code being checked
   * @param {string[]} compatibleCodes - Array of compatible action codes
   * @param {number} stackNumber - Stack identifier
   * @returns {string} Explanation message
   */
  compatible: (code, compatibleCodes, stackNumber) =>
    `  ${code} is compatible with: ${compatibleCodes.join(', ')} in Stack ${stackNumber}`
}

/**
 * Main function that organizes actions into stacks based on compatibility and area constraints
 * @param {object[]} actions - Array of actions to be stacked
 * @param {string} actions[].code - Unique identifier for the action
 * @param {number} actions[].areaSqm - Area of the action in square meters
 * @param {Function} compatibilityCheckFn - Function to check if two action codes are compatible
 * @returns {{explanations: string[], stacks: {stackNumber: number, actionCodes: string[], areaSqm: number}[]}}
 * @throws {Error} Throws error if actions parameter is not an array
 */
export function stackActions(actions, compatibilityCheckFn = () => false) {
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
