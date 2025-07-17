/**
 * @import { Action, Stack, CompatibilityCheckFn } from './available-area.d.js'
 * @import { ExplanationSection } from './explanations.d.js'
 */

/**
 * Converts square meters to hectares and formats as a string
 * @param {number} value - Area in square meters
 * @returns {string} Formatted string with area in hectares
 */
const formatSqmToHa = (value) => `${value / 10000} ha`

/**
 * Creates a factory function for creating stacks with incrementing stack numbers
 * @returns {CompatibilityCheckFn} A createStack function that maintains stack numbering
 */
function makeCreateStack() {
  let stackNumber = 0

  /**
   * Creates a new stack with action codes and area
   * @param {string[]} actionCodes - Array of action codes for this stack
   * @param {number} areaSqm - Area of the stack in square meters
   * @returns {{stack: Stack, explanation: string}} object containing the stack and explanation
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
 * @param {number} currentStackNumber - Current stackNumber that we want to split
 * @param {Function} createStack - Factory function for creating new stacks
 * @param {Stack[]} stacks - Array of existing stacks
 * @param {string[]} explanations - Array of explanation strings
 * @param {Action} action - The action being processed
 * @param {number} remainingAreaForAction - Remaining area to be allocated for the action
 * @returns {{newExplanations: string[], newStacks: Stack[]}} object containing updated explanations and stacks
 */
function splitStacks(
  currentStackNumber,
  createStack,
  stacks,
  explanations,
  action,
  remainingAreaForAction
) {
  const currentStackIndex = currentStackNumber - 1
  const currentStack = stacks[currentStackIndex]

  if (currentStack == null) {
    throw new Error('No stacks available to split')
  }

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
  const createdStackNumber = newStack.stackNumber
  const shiftedStackNumber = currentStackNumber + 1
  newStack.stackNumber = shiftedStackNumber

  currentStack.actionCodes.push(action.actionCode)
  currentStack.areaSqm = remainingAreaForAction

  const stacksAfterNewStack = stacks.slice(currentStackIndex + 1)
  const newStacks = [
    ...stacks.slice(0, currentStackIndex),
    currentStack,
    newStack,
    ...stacksAfterNewStack.map((s) => ({
      ...s,
      stackNumber: s.stackNumber + 1
    }))
  ]

  newExplanations.push(explain.shrinkStack(currentStack, action))
  newExplanations.push(newStackExplanation)

  // if stacks have shifted positions, explain it
  if (createdStackNumber !== shiftedStackNumber) {
    newExplanations.push(
      explain.shiftStackPosition(createdStackNumber, shiftedStackNumber)
    )
    stacksAfterNewStack.forEach((item) => {
      newExplanations.push(
        explain.shiftStackPosition(item.stackNumber, item.stackNumber + 1)
      )
    })
  }
  return { newExplanations, newStacks }
}

/**
 * Checks compatibility between an action and all actions in a stack, based on a compatibility check function
 * @param {Action} action - The action to check compatibility for
 * @param {Stack} stack - The stack to check against
 * @param {string[]} explanations - Current array of explanations
 * @param {CompatibilityCheckFn} compatibilityCheckFn - Function to check if two action codes are compatible
 * @returns {{allCompatible: boolean, newExplanations: string[]}} Compatibility check results
 */
function checkCompatibility(action, stack, explanations, compatibilityCheckFn) {
  const newExplanations = [...explanations]
  const compatibleCodes = []
  const incompatibleCodes = []

  for (const code of stack.actionCodes) {
    if (compatibilityCheckFn(action.actionCode, code)) {
      compatibleCodes.push(code)
    } else {
      incompatibleCodes.push(code)
    }
  }

  if (compatibleCodes.length > 0) {
    newExplanations.push(
      explain.compatible(action.actionCode, compatibleCodes, stack.stackNumber)
    )
  }

  if (incompatibleCodes.length > 0) {
    newExplanations.push(
      explain.notCompatible(
        action.actionCode,
        incompatibleCodes,
        stack.stackNumber
      )
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
   * @param {Action} action - Action being added
   * @returns {string} Explanation message
   */
  addingAction: (action) =>
    `Adding ${action.actionCode} (area ${formatSqmToHa(action.areaSqm)})`,

  /**
   * Generates explanation when action is compatible with all codes in a stack
   * @param {Action} action - Action being checked
   * @param {Stack} existingStack - Stack being checked against
   * @returns {string} Explanation message
   */
  allCodesCompatible: (action, existingStack) =>
    `  ${action.actionCode} is compatible with: ${existingStack.actionCodes.join(', ')} in Stack ${existingStack.stackNumber}`,

  /**
   * Generates explanation when action is not compatible with all codes in a stack
   * @param {Action} action - Action being checked
   * @param {Stack} existingStack - Stack being checked against
   * @returns {string} Explanation message
   */
  allCodesNotCompatible: (action, existingStack) =>
    `  ${action.actionCode} is not compatible with all of: ${existingStack.actionCodes.join(', ')} in Stack ${existingStack.stackNumber}`,

  /**
   * Generates explanation when action is added to an existing stack
   * @param {Action} action - Action being added
   * @param {Stack} existingStack - Stack the action was added to
   * @returns {string} Explanation message
   */
  addedToStack: (action, existingStack) =>
    `  Added ${action.actionCode} to Stack ${existingStack.stackNumber} with area ${formatSqmToHa(existingStack.areaSqm)}`,

  /**
   * Generates explanation when remaining area is less than stack area, requiring split
   * @param {Action} action - Action being processed
   * @param {number} currentArea - Remaining area for the action
   * @param {Stack} stack - Stack that needs to be split
   * @returns {string} Explanation message
   */
  remainingAreaLessThanStack: (action, currentArea, stack) =>
    `  Remaining area of ${action.actionCode} is ${formatSqmToHa(currentArea)}, this is less than the area of Stack ${stack.stackNumber} (${formatSqmToHa(stack.areaSqm)}), split needed`,

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
   * @param {Stack} stack - Stack being shrunk
   * @param {Action} action - Action being added
   * @returns {string} Explanation message
   */
  shrinkStack: (stack, action) =>
    `  Shrinking Stack ${stack.stackNumber} area to ${formatSqmToHa(stack.areaSqm)} and adding ${action.actionCode} to it`,

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
   * Generates explanation for shifting stack numbers
   * @param {number} oldStackNumber - Old stack number being shifted
   * @param {number} newStackNumber - New stack number being shifted
   * @returns {string} Explanation message
   */
  shiftStackPosition: (oldStackNumber, newStackNumber) =>
    `  Shifting Stack ${oldStackNumber} position to become ${newStackNumber}`,

  /**
   * Generates explanation for compatible action codes
   * @param {string} code - Action code being checked
   * @param {string[]} compatibleCodes - Array of compatible action codes
   * @param {number} stackNumber - Stack identifier
   * @returns {string} Explanation message
   */
  compatible: (code, compatibleCodes, stackNumber) =>
    `  ${code} is compatible with: ${compatibleCodes.join(', ')} in Stack ${stackNumber}`,

  /**
   * Formats stacks into a readable string
   * @param {Stack[]} stacks - Array of stacks to format
   * @returns {string[]} Formatted string of stacks
   */
  stacks: (stacks) =>
    stacks.map(
      (stack) =>
        `Stack ${stack.stackNumber} - ${stack.actionCodes.join(', ')} - ${formatSqmToHa(stack.areaSqm)}`
    )
}

function createExplanationSection(stacks, explanations) {
  return {
    title: 'Stacks',
    content: [...explain.stacks(stacks), '', 'Explanation:', ...explanations]
  }
}

/**
 * Main function that organizes actions into stacks based on compatibility and area constraints
 * @param {Action[]} actions - Array of actions to be stacked
 * @param {CompatibilityCheckFn} compatibilityCheckFn - Function to check if two action codes are compatible
 * @returns {{explanations: ExplanationSection, stacks: Stack[]}}
 * @throws {Error} Throws error if actions parameter is not an array
 */
export function stackActions(actions, compatibilityCheckFn = () => false) {
  /** @type {Stack[]} */
  let stacks = []
  let explanations = []
  const createStack = makeCreateStack()

  if (!Array.isArray(actions)) {
    throw new Error('Actions must be an array')
  }

  if (actions.length === 0) {
    return {
      explanations: { title: 'Stacks', content: [explain.noStacksNeeded()] },
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
        existingStack.actionCodes.push(action.actionCode)
        remainingAreaForAction -= existingStack.areaSqm
        explanations.push(explain.addedToStack(action, existingStack))
      } else {
        const { newExplanations, newStacks } = splitStacks(
          existingStack.stackNumber,
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
        [action.actionCode],
        remainingAreaForAction
      )
      stacks.push(newStack)
      explanations.push(explanation)
    }
  }

  return {
    explanations: createExplanationSection(stacks, explanations),
    stacks
  }
}
