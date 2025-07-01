import { getCompatibilityMatrix } from '~/src/api/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
import { stackActions } from './stackActions.js'
import { subtractIncompatibleStacks } from './subtractIncompatibleStacks.js'
import { sqmToHaRounded } from '~/src/api/common/helpers/measurement.js'

export const createCompatibilityMatrix = async (codes, logger) => {
  const compatibilityMatrices = await getCompatibilityMatrix(codes, logger)
  return (action1, action2) => {
    return compatibilityMatrices.some(
      (a) => a.optionCode === action2 && a.optionCodeCompat === action1
    )
  }
}

export function calculateAvailableArea(
  processedActions,
  action,
  totalValidLandCoverSqm,
  compatibilityCheckFn
) {
  // group existing action stacks and assign area
  const result = stackActions(processedActions, compatibilityCheckFn)

  // subtract areas of stacks where any action is not compatible
  const availableAreaSqm = subtractIncompatibleStacks(
    action.code,
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
