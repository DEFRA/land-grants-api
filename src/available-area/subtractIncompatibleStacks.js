/**
 * Checks if all action codes in an array are compatible with a given code, according to a compatibility check function
 * @param {string} code - The action code to check compatibility against
 * @param {string[]} codes - Array of action codes to check
 * @param {Function} compatibilityCheckFn - Function to check if two action codes are compatible
 * @returns {boolean} true if all codes are compatible with the given code
 */
function allActionCodesAreCompatible(code, codes, compatibilityCheckFn) {
  return codes.every((c) => compatibilityCheckFn(c, code))
}

/**
 * Validates input parameters for the subtractIncompatibleStacks function
 * @param {string} actionCodeAppliedFor - Action code being applied for
 * @param {number} totalValidLandCoverSqm - Total valid land cover area in square meters
 * @param {object[]} stacks - Array of stack objects
 * @param {Function} compatibilityCheckFn - Function to check action code compatibility
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
 * @param {object[]} stacks - Array of stack objects containing actionCodes and areaSqm
 * @param {string[]} stacks[].actionCodes - Array of action codes in the stack
 * @param {number} stacks[].areaSqm - Area of the stack in square meters
 * @param {Function} compatibilityCheckFn - Function to check if two action codes are compatible
 * @returns {number} Remaining land cover area after subtracting incompatible stacks
 * @throws {Error} Throws error if input parameters are invalid
 */
export function subtractIncompatibleStacks(
  actionCodeAppliedFor,
  totalValidLandCoverSqm,
  stacks,
  compatibilityCheckFn
) {
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

  return incompatibleStacks.reduce(
    (acc, stack) => acc - stack.areaSqm,
    totalValidLandCoverSqm
  )
}
