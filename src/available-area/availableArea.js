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
 * Processes land cover data and calculates total valid area
 * @param {object} params - Parameters object
 * @param {object} params.availableAreaDataRequirements - Available area data requirements
 * @param {string} params.actionCodeAppliedFor - The action code being applied for
 * @param {string} params.sheetId - The sheet ID
 * @param {string} params.parcelId - The parcel ID
 * @param {object} params.logger - Logger instance
 * @returns {object} Total valid land cover area and explanations
 */
function processLandCoverData({
  availableAreaDataRequirements,
  actionCodeAppliedFor,
  sheetId,
  parcelId,
  logger
}) {
  const {
    landCoverCodesForAppliedForAction,
    landCoversForParcel,
    landCoverToString
  } = availableAreaDataRequirements

  const mergedLandCoverCodesForAppliedForAction = mergeLandCoverCodes(
    landCoverCodesForAppliedForAction
  )

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

  return {
    mergedLandCoverCodesForAppliedForAction,
    totalValidLandCoverSqm,
    totalValidLandCoverExplanations
  }
}

/**
 * Filters and processes existing actions based on land cover compatibility
 * @param {Action[]} existingActions - Existing actions
 * @param {object} availableAreaDataRequirements - Available area data requirements
 * @param {object[]} mergedLandCoverCodesForAppliedForAction - Merged land cover codes
 * @param {Function} landCoverToString - Function to convert land cover codes to strings
 * @param {object} logger - Logger instance
 * @returns {object} Filtered actions and explanations
 */
function processExistingActions(
  existingActions,
  availableAreaDataRequirements,
  mergedLandCoverCodesForAppliedForAction,
  logger
) {
  const { landCoversForExistingActions, landCoverToString } =
    availableAreaDataRequirements

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

  return {
    existingActionsWithLandCoverInCommonWithAppliedForAction,
    filterExplanations
  }
}

/**
 * Processes incompatible land cover areas and revises actions
 * @param {object} params - Parameters object
 * @param {string} params.parcelId - The parcel ID
 * @param {string} params.sheetId - The sheet ID
 * @param {string} params.actionCodeAppliedFor - The action code being applied for
 * @param {Action[]} params.existingActionsWithLandCoverInCommonWithAppliedForAction - Filtered existing actions
 * @param {AvailableAreaDataRequirements} params.availableAreaDataRequirements - Available area data requirements
 * @param {object[]} params.mergedLandCoverCodesForAppliedForAction - Merged land cover codes
 * @param {object} params.logger - Logger instance
 * @returns {object} Revised actions and explanations
 */
function processIncompatibleAreas({
  parcelId,
  sheetId,
  actionCodeAppliedFor,
  existingActionsWithLandCoverInCommonWithAppliedForAction,
  availableAreaDataRequirements,
  mergedLandCoverCodesForAppliedForAction,
  logger
}) {
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
    incompatibleLandCoverExplanations
  }
}

/**
 * Builds the complete explanation array from all processing steps
 * @param {object[]} initialExplanations - Initial explanations
 * @param {object} totalValidLandCoverExplanations - Total valid land cover explanations
 * @param {object} filterExplanations - Filter explanations
 * @param {object} incompatibleLandCoverExplanations - Incompatible land cover explanations
 * @param {object} stackExplanations - Stack explanations
 * @param {object} resultExplanation - Result explanation
 * @returns {object[]} Complete explanations array
 */
function buildExplanations(
  initialExplanations,
  totalValidLandCoverExplanations,
  filterExplanations,
  incompatibleLandCoverExplanations,
  stackExplanations,
  resultExplanation
) {
  return [
    ...initialExplanations,
    totalValidLandCoverExplanations,
    filterExplanations,
    incompatibleLandCoverExplanations,
    stackExplanations,
    resultExplanation
  ]
}

/**
 * Main function to get available area for an action
 * @param {string} actionCodeAppliedFor - The action code being applied for
 * @param {string} sheetId - The sheet ID
 * @param {string} parcelId - The parcel ID
 * @param {CompatibilityCheckFn} compatibilityCheckFn - Compatibility check function
 * @param {Action[]} existingActions - The list of existing actions
 * @param {AvailableAreaDataRequirements} availableAreaDataRequirements - Data requirements
 * @param {object} logger - The logger object
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

  const initialExplanations = getInitialExplanations(
    actionCodeAppliedFor,
    sheetId,
    parcelId,
    existingActions,
    availableAreaDataRequirements
  )

  const {
    mergedLandCoverCodesForAppliedForAction,
    totalValidLandCoverSqm,
    totalValidLandCoverExplanations
  } = processLandCoverData({
    availableAreaDataRequirements,
    actionCodeAppliedFor,
    sheetId,
    parcelId,
    logger
  })

  const {
    existingActionsWithLandCoverInCommonWithAppliedForAction,
    filterExplanations
  } = processExistingActions(
    existingActions,
    availableAreaDataRequirements,
    mergedLandCoverCodesForAppliedForAction,
    logger
  )

  const { revisedActions, incompatibleLandCoverExplanations } =
    processIncompatibleAreas({
      parcelId,
      sheetId,
      actionCodeAppliedFor,
      existingActionsWithLandCoverInCommonWithAppliedForAction,
      availableAreaDataRequirements,
      mergedLandCoverCodesForAppliedForAction,
      logger
    })

  const {
    stacks,
    stackExplanations,
    resultExplanation,
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

  const explanations = buildExplanations(
    initialExplanations,
    totalValidLandCoverExplanations,
    filterExplanations,
    incompatibleLandCoverExplanations,
    stackExplanations,
    resultExplanation
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
    stackExplanations,
    resultExplanation,
    availableAreaSqm,
    availableAreaHectares
  }
}
