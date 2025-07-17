/**
 * @import { Action, Stack, CompatibilityCheckFn } from './available-area.d.js'
 */

import { sqmToHaRounded } from '../api/common/helpers/measurement.js'
import { createExplanationSection } from './explanations.js'

/**
 * Explanation message generators for total calculation operations
 */
const explain = {
  /**
   * Generates explanation for total valid land cover
   * @param {number} areaSqm - Area in sqm of the land class code
   * @returns {string} Explanation message
   */
  totalValidLandCover: (areaSqm) => {
    return `Total valid land cover: ${sqmToHaRounded(areaSqm)} ha`
  },

  /**
   * Generates explanation for incompatible stack
   * @param {Stack} stack - Stack object
   * @returns {string} Explanation message
   */
  incompatibleStack: (stack) => {
    return `- ${sqmToHaRounded(stack.areaSqm)} (Stack ${stack.stackNumber})`
  },

  /**
   * Generates explanation for total amount
   * @param {number} totalAvailableAreaForAction - Total available area
   * @param {string} actionCode - Action code
   * @returns {string} Explanation message
   */
  totalAvailableAreaForAction: (totalAvailableAreaForAction, actionCode) => {
    return `= ${sqmToHaRounded(totalAvailableAreaForAction)} ha available for ${actionCode}`
  }
}

/**
 * Checks if all action codes in an array are compatible with a given code, according to a compatibility check function
 * @param {string} code - The action code to check compatibility against
 * @param {string[]} codes - Array of action codes to check
 * @param {CompatibilityCheckFn} compatibilityCheckFn - Function to check if two action codes are compatible
 * @returns {boolean} true if all codes are compatible with the given code
 */
function allActionCodesAreCompatible(code, codes, compatibilityCheckFn) {
  return codes.every((c) => compatibilityCheckFn(c, code))
}

/**
 * Validates input parameters for the subtractIncompatibleStacks function
 * @param {string} actionCodeAppliedFor - Action code being applied for
 * @param {number} totalValidLandCoverSqm - Total valid land cover area in square meters
 * @param {Stack[]} stacks - Array of stack objects
 * @param {CompatibilityCheckFn} compatibilityCheckFn - Function to check action code compatibility
 * @throws {Error} Throws error if any parameter is invalid
 */
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

/**
 * Calculates remaining land cover area after subtracting incompatible stacks
 * @param {string} actionCodeAppliedFor - Action code being applied for
 * @param {number} totalValidLandCoverSqm - Total valid land cover area in square meters
 * @param {Stack[]} stacks - Array of stack objects containing actionCodes and areaSqm
 * @param {CompatibilityCheckFn} compatibilityCheckFn - Function to check if two action codes are compatible
 * @returns {number} Remaining land cover area after subtracting incompatible stacks
 * @throws {Error} Throws error if input parameters are invalid
 */
export function subtractIncompatibleStacks(
  actionCodeAppliedFor,
  totalValidLandCoverSqm,
  stacks,
  compatibilityCheckFn
) {
  const explanations = []
  explanations.push(explain.totalValidLandCover(totalValidLandCoverSqm))

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

  const result = incompatibleStacks.reduce((acc, stack) => {
    explanations.push(explain.incompatibleStack(stack))
    return acc - stack.areaSqm
  }, totalValidLandCoverSqm)

  explanations.push(
    explain.totalAvailableAreaForAction(result, actionCodeAppliedFor)
  )
  return {
    result: result < 0 ? 0 : result,
    explanation: createExplanationSection('Result', explanations)
  }
}
