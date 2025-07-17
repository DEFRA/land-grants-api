import { getCompatibilityMatrix } from '../api/compatibility-matrix/queries/getCompatibilityMatrix.query.js'

/**
 * Creates a compatibility checking function based on the database and the codes passed
 * @param {object} logger
 * @param {object} db
 * @param {string[]} codes
 * @returns
 */
export const createCompatibilityMatrix = async (logger, db, codes = null) => {
  const compatibilityMatrices = await getCompatibilityMatrix(logger, db, codes)
  return (action1, action2) => {
    return compatibilityMatrices.some(
      (a) =>
        (a.option_code === action2 && a.option_code_compat === action1) ||
        (a.option_code === action1 && a.option_code_compat === action2)
    )
  }
}

/**
 * @import { Action, CompatibilityCheckFn } from "./available-area.d.js"
 */
