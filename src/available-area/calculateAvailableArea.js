import { sqmToHaRounded } from '~/src/api/common/helpers/measurement.js'
import { getCompatibilityMatrix } from '~/src/api/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
import { stackActions } from './stackActions.js'
import { subtractIncompatibleStacks } from './subtractIncompatibleStacks.js'

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
        (a.optionCode === action2 && a.optionCodeCompat === action1) ||
        (a.optionCode === action1 && a.optionCodeCompat === action2)
    )
  }
}

/**
 *
 * @param {Action[]} processedActions
 * @param {string} actionCodeAppliedFor
 * @param {number} totalValidLandCoverSqm
 * @param {CompatibilityCheckFn} compatibilityCheckFn
 * @returns
 */
export function calculateAvailableArea(
  processedActions,
  actionCodeAppliedFor,
  totalValidLandCoverSqm,
  compatibilityCheckFn
) {
  // group existing action stacks and assign area
  const result = stackActions(processedActions, compatibilityCheckFn)

  // subtract areas of stacks where any action is not compatible
  const availableAreaSqm = subtractIncompatibleStacks(
    actionCodeAppliedFor,
    totalValidLandCoverSqm,
    result.stacks,
    compatibilityCheckFn
  )

  return {
    ...result,
    availableAreaSqm,
    totalValidLandCoverSqm,
    availableAreaHectares: sqmToHaRounded(availableAreaSqm)
  }
}

/**
 * @import { Action, CompatibilityCheckFn } from "./available-area.d.js"
 */
