import { getCompatibilityMatrix } from '../api/compatibility-matrix/queries/getCompatibilityMatrix.query.js'

/**
 * Creates a compatibility checking function based on the database and the codes passed
 * @param {Logger} logger
 * @param {Pool} db
 * @param {string[] | null} codes
 * @returns {Promise<(action1: string, action2: string) => boolean>}
 */
export const createCompatibilityMatrix = async (logger, db, codes = null) => {
  const compatibilityMatrices = await getCompatibilityMatrix(logger, db, codes)
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
 * @import { Logger } from '~/src/api/common/logger.d.js'
 * @import { Pool } from '~/src/api/common/postgres.d.js'
 */
