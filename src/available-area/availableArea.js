import { sqmToHaRounded } from '~/src/api/common/helpers/measurement.js'
import { getLandCoverDefinitions } from '../api/land-cover-codes/queries/getLandCoverDefinitions.query.js'
import {
  getLandCoversForAction,
  getLandCoversForActions
} from '../api/land-cover-codes/queries/getLandCoversForActions.query.js'
import { mergeLandCoverCodes } from '../api/land-cover-codes/services/merge-land-cover-codes.js'
import { getLandCoversForParcel } from '../api/parcel/queries/getLandCoversForParcel.query.js'
import { calculateTotalValidLandCoverArea } from './calculateTotalValidLandCoverArea.js'
import { getInitialExplanations } from './explanations.js'
import { filterActionsWithCommonLandCover } from './filterActionsWithCommonLandCover.js'
import { stackActions } from './stackActions.js'
import { subtractIncompatibleLandCoverAreaFromActions } from './subtractIncompatibleLandCoverAreaFromActions.js'
import { subtractIncompatibleStacks } from './subtractIncompatibleStacks.js'
import { createLandCoverCodeToString } from '../api/land-cover-codes/services/createLandCoverCodeToString.js'

/**
 * Fetches the land cover codes for the action being applied for, the land covers for the parcel,
 * and the land covers for existing actions.
 * @param {string} actionCodeAppliedFor - The action code being applied for
 * @param {string} sheetId - The sheet ID of the parcel
 * @param {string} parcelId - The parcel ID
 * @param {Action[]} existingActions - The list of existing actions
 * @param {object} postgresDb - The Postgres database connection
 * @param {object} logger - The logger object
 * @returns {Promise<AvailableAreaDataRequirements>} - An object containing land cover codes for the action, land covers for the parcel, and land covers for existing actions
 */
export async function getAvailableAreaDataRequirements(
  actionCodeAppliedFor,
  sheetId,
  parcelId,
  existingActions,
  postgresDb,
  logger
) {
  const landCoverCodesForAppliedForAction = await getLandCoversForAction(
    actionCodeAppliedFor,
    postgresDb,
    logger
  )

  logger.info(
    `Found ${landCoverCodesForAppliedForAction.length} landCoverCodesForAppliedForAction for action: ${actionCodeAppliedFor} for parcel: ${sheetId}-${parcelId}: ${JSON.stringify(
      landCoverCodesForAppliedForAction
    )}`
  )

  const landCoversForParcel = await getLandCoversForParcel(
    sheetId,
    parcelId,
    postgresDb,
    logger
  )

  const landCoversForExistingActions = await getLandCoversForActions(
    existingActions.map((a) => a.actionCode),
    postgresDb,
    logger
  )

  const landCoverCodesForExistingActions = Object.keys(
    landCoversForExistingActions
  ).flatMap((k) => landCoversForExistingActions[k].map((c) => c.landCoverCode))

  const allLandCoverCodes = new Set([
    ...landCoverCodesForAppliedForAction.map((c) => c.landCoverCode),
    ...landCoversForParcel.map((c) => c.landCoverClassCode),
    ...landCoverCodesForExistingActions
  ])

  logger.info('All land cover codes:', allLandCoverCodes)

  const landCoverDefinitions = await getLandCoverDefinitions(
    Array.from(allLandCoverCodes),
    postgresDb,
    logger
  )

  const landCoverToString = createLandCoverCodeToString(landCoverDefinitions)

  return {
    landCoverCodesForAppliedForAction,
    landCoversForParcel,
    landCoversForExistingActions,
    landCoverToString
  }
}

/**
 * Prepares the data needed for available area calculations
 * @param {AvailableAreaDataRequirements} availableAreaDataRequirements
 * @returns {object} Prepared data including merged land cover codes
 */
function prepareCalculationData(availableAreaDataRequirements) {
  const {
    landCoverCodesForAppliedForAction,
    landCoversForParcel,
    landCoversForExistingActions,
    landCoverToString
  } = availableAreaDataRequirements

  const mergedLandCoverCodesForAppliedForAction = mergeLandCoverCodes(
    landCoverCodesForAppliedForAction
  )

  return {
    landCoversForParcel,
    landCoversForExistingActions,
    landCoverToString,
    mergedLandCoverCodesForAppliedForAction
  }
}

/**
 * Calculates the total valid land cover area for the applied action
 * @param {object} landCoversForParcel
 * @param {object} mergedLandCoverCodesForAppliedForAction
 * @param {Function} landCoverToString
 * @param {string} actionCodeAppliedFor
 * @param {string} sheetId
 * @param {string} parcelId
 * @param {object} logger
 * @returns {object} Total valid land cover area and explanations
 */
function calculateValidLandCoverArea(
  landCoversForParcel,
  mergedLandCoverCodesForAppliedForAction,
  landCoverToString,
  actionCodeAppliedFor,
  sheetId,
  parcelId,
  logger
) {
  const {
    result: totalValidLandCoverSqm,
    explanations: totalValidLandCoverExplanations
  } = calculateTotalValidLandCoverArea(
    landCoversForParcel,
    mergedLandCoverCodesForAppliedForAction,
    landCoverToString
  )

  logger.info(
    `totalValidLandCoverSqm ${totalValidLandCoverSqm} for action: ${actionCodeAppliedFor} for parcel: ${sheetId}-${parcelId}`
  )

  return { totalValidLandCoverSqm, totalValidLandCoverExplanations }
}

/**
 * Filters existing actions and calculates revised actions after subtracting incompatible areas
 * @param {Action[]} existingActions
 * @param {object} landCoversForExistingActions
 * @param {object} mergedLandCoverCodesForAppliedForAction
 * @param {Function} landCoverToString
 * @param {string} parcelId
 * @param {string} sheetId
 * @param {string} actionCodeAppliedFor
 * @param {AvailableAreaDataRequirements} availableAreaDataRequirements
 * @param {object} logger
 * @returns {object} Filtered actions, revised actions, and explanations
 */
function processExistingActions(
  existingActions,
  landCoversForExistingActions,
  mergedLandCoverCodesForAppliedForAction,
  landCoverToString,
  parcelId,
  sheetId,
  actionCodeAppliedFor,
  availableAreaDataRequirements,
  logger
) {
  const {
    existingActionsWithLandCoverInCommonWithAppliedForAction,
    explanationSection: filterExplanations
  } = filterActionsWithCommonLandCover(
    existingActions || [],
    landCoversForExistingActions,
    mergedLandCoverCodesForAppliedForAction,
    landCoverToString
  )

  logger.info(
    `existingActionsWithLandCoverInCommonWithAppliedForAction ${JSON.stringify(existingActionsWithLandCoverInCommonWithAppliedForAction)}`
  )

  const {
    result: revisedActions,
    explanations: incompatibleLandCoverExplanations
  } = subtractIncompatibleLandCoverAreaFromActions(
    parcelId,
    sheetId,
    actionCodeAppliedFor,
    existingActionsWithLandCoverInCommonWithAppliedForAction,
    {
      ...availableAreaDataRequirements,
      landCoverCodesForAppliedForAction: mergedLandCoverCodesForAppliedForAction
    },
    logger
  )

  return {
    revisedActions,
    filterExplanations,
    incompatibleLandCoverExplanations
  }
}

/**
 * Assembles all explanations into a single array
 * @param {Array} initialExplanations
 * @param {object} totalValidLandCoverExplanations
 * @param {object} filterExplanations
 * @param {object} incompatibleLandCoverExplanations
 * @param {object} stackAndSubtractExplanations
 * @returns {Array} Combined explanations
 */
function assembleExplanations(
  initialExplanations,
  totalValidLandCoverExplanations,
  filterExplanations,
  incompatibleLandCoverExplanations,
  stackAndSubtractExplanations
) {
  return [
    ...initialExplanations,
    totalValidLandCoverExplanations,
    filterExplanations,
    incompatibleLandCoverExplanations,
    stackAndSubtractExplanations.stackExplanations,
    stackAndSubtractExplanations.resultExplanation
  ]
}

/**
 * Main function to get available area for an action
 * @param {string} actionCodeAppliedFor
 * @param {string} sheetId
 * @param {string} parcelId
 * @param {CompatibilityCheckFn} compatibilityCheckFn
 * @param {Action[]} existingActions
 * @param {AvailableAreaDataRequirements} availableAreaDataRequirements
 * @param {object} logger
 * @returns {object} Available area calculation results
 */
export function getAvailableAreaForAction(
  actionCodeAppliedFor,
  sheetId,
  parcelId,
  compatibilityCheckFn,
  existingActions,
  availableAreaDataRequirements,
  logger
) {
  logger.info(
    `Getting available area for action: ${actionCodeAppliedFor} for parcel: ${sheetId}-${parcelId}`
  )

  // Prepare calculation data
  const {
    landCoversForParcel,
    landCoversForExistingActions,
    landCoverToString,
    mergedLandCoverCodesForAppliedForAction
  } = prepareCalculationData(availableAreaDataRequirements)

  // Get initial explanations
  const initialExplanations = getInitialExplanations(
    actionCodeAppliedFor,
    sheetId,
    parcelId,
    availableAreaDataRequirements,
    existingActions
  )

  // Calculate total valid land cover area
  const { totalValidLandCoverSqm, totalValidLandCoverExplanations } =
    calculateValidLandCoverArea(
      landCoversForParcel,
      mergedLandCoverCodesForAppliedForAction,
      landCoverToString,
      actionCodeAppliedFor,
      sheetId,
      parcelId,
      logger
    )

  // Process existing actions and calculate revised actions
  const {
    revisedActions,
    filterExplanations,
    incompatibleLandCoverExplanations
  } = processExistingActions(
    existingActions,
    landCoversForExistingActions,
    mergedLandCoverCodesForAppliedForAction,
    landCoverToString,
    parcelId,
    sheetId,
    actionCodeAppliedFor,
    availableAreaDataRequirements,
    logger
  )

  // Calculate final available area with stacking
  const {
    stacks,
    explanations: stackAndSubtractExplanations,
    availableAreaSqm,
    availableAreaHectares
  } = stackAndSubtractIncompatibleStacks(
    revisedActions,
    compatibilityCheckFn,
    actionCodeAppliedFor,
    totalValidLandCoverSqm
  )

  logger.info(
    `availableArea ${availableAreaHectares} for action: ${actionCodeAppliedFor} for parcel: ${sheetId}-${parcelId}`
  )

  // Assemble all explanations
  const explanations = assembleExplanations(
    initialExplanations,
    totalValidLandCoverExplanations,
    filterExplanations,
    incompatibleLandCoverExplanations,
    stackAndSubtractExplanations
  )

  return {
    stacks,
    explanations,
    availableAreaSqm,
    totalValidLandCoverSqm,
    availableAreaHectares
  }
}

/**
 * @import { Action, CompatibilityCheckFn, AvailableAreaDataRequirements } from './available-area.d.js'
 */

/**
 *
 * @param {ActionWithArea[]} revisedActions
 * @param {CompatibilityCheckFn} compatibilityCheckFn
 * @param {string} actionCodeAppliedFor
 * @param {number} totalValidLandCoverSqm
 * @returns {StackResult}
 */
export function stackAndSubtractIncompatibleStacks(
  revisedActions,
  compatibilityCheckFn,
  actionCodeAppliedFor,
  totalValidLandCoverSqm
) {
  const { stacks, explanations: stackExplanations } = stackActions(
    revisedActions,
    compatibilityCheckFn
  )

  // subtract areas of stacks where any action is not compatible
  const { result: availableAreaSqm, explanationSection: resultExplanation } =
    subtractIncompatibleStacks(
      actionCodeAppliedFor,
      totalValidLandCoverSqm,
      stacks,
      compatibilityCheckFn
    )

  const availableAreaHectares = sqmToHaRounded(availableAreaSqm)

  return {
    stacks,
    availableAreaSqm,
    availableAreaHectares,
    explanations: {
      stackExplanations,
      resultExplanation
    }
  }
}
