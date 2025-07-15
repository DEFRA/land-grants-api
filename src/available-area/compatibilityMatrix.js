import { getCompatibilityMatrix } from '../api/compatibility-matrix/queries/getCompatibilityMatrix.query.js'

/**
 * Creates a compatibility checking function based on the database and the codes passed
 * @param {object} logger
 * @param {string[] | null} codes
 * @returns
 */
export const createCompatibilityMatrix = async (logger, codes = null) => {
  const compatibilityMatrices = await getCompatibilityMatrix(logger, codes)
  return (action1, action2) => {
    return compatibilityMatrices.some(
      (a) =>
        (a.optionCode === action2 && a.optionCodeCompat === action1) ||
        (a.optionCode === action1 && a.optionCodeCompat === action2)
    )
  }
}

/**
 * @import { Action, CompatibilityCheckFn } from "./available-area.d.js"
 */
