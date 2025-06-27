import { getCompatibilityMatrix } from '~/src/api/compatibility-matrix/queries/getCompatibilityMatrix.query.js'
import { stackActions } from './stackActions.js'
import { getActions } from '~/src/api/actions/queries/getActions.query.js'
import { getLandCoverCodesForCodes } from '~/src/api/land-cover-codes/queries/getLandCoverCodes.query.js'
import { getParcelAvailableArea } from '~/src/api/parcel/queries/getParcelAvailableArea.query.js'
import { subtractIncompatibleStacks } from './subtractIncompatibleStacks.js'
import { sqmToHaRounded } from '~/src/api/common/helpers/measurement.js'

const createCompatibilityMatrix = async (logger) => {
  const compatibilityMatrices = await getCompatibilityMatrix(logger)

  return (action1, action2) => {
    return compatibilityMatrices.some(
      (a) => a.optionCode === action2 && a.optionCodeCompat === action1
    )
  }
}

// Mock get parcels controller, would return a single parcel with multiple actions
// This just returns a single parcel with a single action
export const MockParcelsController = async (
  sheetId,
  parcelId,
  existingActions,
  actionToProcess,
  postgresDb,
  logger
) => {
  // reduce to an array of codes only
  // [{ code: 'CMOR1', areaSqm: 0.1 }] => ['CMOR1']
  const codes = actionToProcess.map((a) => a.code)

  // we are restricing to one action for now
  // get all actions for the codes from mongo getActionConfigs
  const allActions = await getActions(logger, codes)

  // for now we only support one action
  // will need to run the calculateAvailableArea function for each action
  const action = allActions[0]

  // get all land cover class codes that are valid for the action
  // this list includes the cover codes and the class codes
  const landCoverCodes = await getLandCoverCodesForCodes(
    action.landCoverClassCodes,
    logger
  )

  // calculate the total for each land cover class code that is valid for the applied action
  const totalValidLandCoverSqm = await getParcelAvailableArea(
    sheetId,
    parcelId,
    landCoverCodes,
    postgresDb,
    logger
  )

  // create a compatibility check function
  // pass in all action codes for the actions we care about, right now it would be day one 7 actions
  const compatibilityCheckFn = await createCompatibilityMatrix(codes, logger)

  return calculateAvailableArea(
    existingActions,
    actionToProcess[0],
    totalValidLandCoverSqm,
    compatibilityCheckFn
  )
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
