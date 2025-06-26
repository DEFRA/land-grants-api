import { getCompatibilityMatrix } from '~/src/api/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
import { stackActions } from './stackActions.js'

const createCompatibilityMatrix = async (actions, logger) => {
  const compatibilityMatrices = await getCompatibilityMatrix(actions, logger)

  return (action1, action2) => {
    return compatibilityMatrices.some(
      (a) => a.optionCode === action2 && a.optionCodeCompat === action1
    )
  }
}

// where do we get the actions from?
// 1. agreements
// 2. actions submitted by the user as part of validation.
// question, how do we test this work?
// the get parcels endpoint will need agreements
// the validation endpoint will submit actions, so this one can be tested.

export async function calculateAvailableArea(logger, actions) {
  const codes = actions.map((a) => a.code)
  const compatibilityCheckFn = await createCompatibilityMatrix(codes, logger)
  const result = stackActions(actions, compatibilityCheckFn)
  return result
}
