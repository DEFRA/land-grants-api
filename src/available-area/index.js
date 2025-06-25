import { getCompatibilityMatrix } from '~/src/api/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
// import { stackActions } from './stackActions.js'

// const compatibilityCheckFn = (compatibilityMatrix, action) => {
//   return compatibilityMatrix.find((a) => a === action)
// }

export async function calculateAvailableArea(logger) {
  // const actions = [
  //   { code: 'CMOR1', areaSqm: 3 },
  //   { code: 'UPL1', areaSqm: 8 },
  //   { code: 'UPL2', areaSqm: 9 }
  // ]

  const compatibilityMatrix = await getCompatibilityMatrix('CMOR1', logger)

  // currently in stack actions we do not await compatibilityCheckFn
  // might be better to pass compatibilityMatrix to stackActions, and then pass
  // compatibilityMatrix into the compatibilityCheckFn, and just pass in one action

  // const fn = await compatibilityCheckFn(compatibilityMatrix, 'CMOR1', 'UPL1')
  // const result = stackActions(actions, compatibilityMatrix, fn)

  // return result
  return compatibilityMatrix
}
