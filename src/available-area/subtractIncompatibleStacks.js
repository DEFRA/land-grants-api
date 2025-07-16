import { createExplanationSection } from './explanations.js'

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
 * @returns {{result: number, explanations: ExplanationSection }} Remaining land cover area after subtracting incompatible stacks
 * @throws {Error} Throws error if input parameters are invalid
 */
export function subtractIncompatibleStacks(
  actionCodeAppliedFor,
  totalValidLandCoverSqm,
  stacks,
  compatibilityCheckFn
) {
  const explanations = [`Total valid land cover: ${totalValidLandCoverSqm} sqm`]
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
    explanations.push(`- ${stack.areaSqm} (Stack ${stack.stackNumber})`)
    return acc - stack.areaSqm
  }, totalValidLandCoverSqm)

  return {
    result: result < 0 ? 0 : result,
    explanations: createExplanationSection(`Result`, explanations)
  }
}

/**
 * @import { Action, Stack, CompatibilityCheckFn } from './available-area.d.js'
 * @import { ExplanationSection } from './explanations.d.js'
 */
