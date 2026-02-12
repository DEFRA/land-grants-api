import { sqmToHaRounded } from '~/src/features/common/helpers/measurement.js'
import { getLandCoverDefinitions } from '~/src/features/land-cover-codes/queries/getLandCoverDefinitions.query.js'
import {
  getLandCoversForAction,
  getLandCoversForActions
} from '~/src/features/land-cover-codes/queries/getLandCoversForActions.query.js'
import { mergeLandCoverCodes } from '~/src/features/land-cover-codes/services/merge-land-cover-codes.js'
import { getLandCoversForParcel } from '~/src/features/parcel/queries/getLandCoversForParcel.query.js'
import { calculateTotalValidLandCoverArea } from '~/src/features/available-area/calculateTotalValidLandCoverArea.js'
import { getInitialExplanations } from '~/src/features/available-area/explanations.js'
import { filterActionsWithCommonLandCover } from '~/src/features/available-area/filterActionsWithCommonLandCover.js'
import { stackActions } from '~/src/features/available-area/stackActions.js'
import { subtractIncompatibleLandCoverAreaFromActions } from '~/src/features/available-area/subtractIncompatibleLandCoverAreaFromActions.js'
import { subtractIncompatibleStacks } from '~/src/features/available-area/subtractIncompatibleStacks.js'
import { createLandCoverCodeToString } from '~/src/features/land-cover-codes/services/createLandCoverCodeToString.js'
import { logInfo } from '~/src/features/common/helpers/logging/log-helpers.js'

/**
 * Fetches the land cover codes for the action being applied for, the land covers for the parcel,
 * and the land covers for existing actions.
 * @param {string} actionCodeAppliedFor - The action code being applied for
 * @param {string} sheetId - The sheet ID of the parcel
 * @param {string} parcelId - The parcel ID
 * @param {Action[]} existingActions - The list of existing actions
 * @param {Pool} postgresDb - The Postgres database connection
 * @param {Logger} logger - The logger object
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
 * @param {LandCover[]} params.landCoversForParcel - Land covers for the parcel
 * @param {LandCoverCodes[]} params.landCoverCodesForAppliedForAction - Land cover codes for the applied action
 * @param {CodeToString} params.landCoverToString - Function to convert land cover codes to strings
 * @param {string} params.actionCodeAppliedFor - The action code being applied for
 * @param {string} params.sheetId - The sheet ID
 * @param {string} params.parcelId - The parcel ID
 * @param {Logger} params.logger - Logger instance
 * @returns {ProcessedLandCoverData} Total valid land cover area and explanations
 */
function processLandCoverData({
  landCoversForParcel,
  landCoverCodesForAppliedForAction,
  landCoverToString,
  actionCodeAppliedFor,
  sheetId,
  parcelId,
  logger
}) {
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

  logInfo(logger, {
    category: 'aac',
    message: 'Process land cover data',
    context: {
      totalValidLandCoverSqm,
      actionCodeAppliedFor,
      sheetId,
      parcelId
    }
  })

  return {
    mergedLandCoverCodesForAppliedForAction,
    totalValidLandCoverSqm,
    totalValidLandCoverExplanations
  }
}

/**
 * Filters and processes existing actions based on land cover compatibility
 * @param {Action[]} existingActions - Existing actions
 * @param {{[key: string]: LandCoverCodes[]}} landCoversForExistingActions - Land covers for existing actions
 * @param {object[]} mergedLandCoverCodesForAppliedForAction - Merged land cover codes
 * @param {CodeToString} landCoverToString - Function to convert land cover codes to strings
 * @param {Logger} logger - Logger instance
 * @returns {object} Filtered actions and explanations
 */
function processExistingActions(
  existingActions,
  landCoversForExistingActions,
  mergedLandCoverCodesForAppliedForAction,
  landCoverToString,
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

  logInfo(logger, {
    category: 'aac',
    message: 'Process existing actions',
    context: {
      existingActionsWithLandCoverInCommonWithAppliedForAction: JSON.stringify(
        existingActionsWithLandCoverInCommonWithAppliedForAction
      )
    }
  })

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
 * @param {string[]} params.mergedLandCoverCodesForAppliedForAction - Merged land cover codes
 * @param {Logger} params.logger - Logger instance
 * @returns {{revisedActions: ActionWithArea[], incompatibleLandCoverExplanations: ExplanationSection}} Revised actions and explanations
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
    availableAreaDataRequirements,
    mergedLandCoverCodesForAppliedForAction,
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
 * Processes stacking of actions and calculates final available area
 * @param {ActionWithArea[]} revisedActions - Revised actions after incompatible area processing
 * @param {CompatibilityCheckFn} compatibilityCheckFn - Compatibility check function
 * @param {string} actionCodeAppliedFor - The action code being applied for
 * @param {number} totalValidLandCoverSqm - Total valid land cover area in square meters
 * @param {Logger} logger - Logger instance
 * @returns {object} Stacking results with explanations and available area
 */
function processStackingAndCalculateArea(
  revisedActions,
  compatibilityCheckFn,
  actionCodeAppliedFor,
  totalValidLandCoverSqm,
  logger
) {
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

  logInfo(logger, {
    category: 'aac',
    message: 'Available area result for action',
    context: {
      availableAreaHectares,
      availableAreaSqm,
      actionCodeAppliedFor
    }
  })

  return {
    stacks,
    stackExplanations,
    resultExplanation,
    availableAreaSqm,
    availableAreaHectares
  }
}

/**
 * Builds and returns the final result object for available area calculation
 * @param {object} params - Parameters object
 * @param {object[]} params.initialExplanations - Initial explanations
 * @param {object} params.totalValidLandCoverExplanations - Total valid land cover explanations
 * @param {object} params.filterExplanations - Filter explanations
 * @param {object} params.incompatibleLandCoverExplanations - Incompatible land cover explanations
 * @param {object} params.stackExplanations - Stack explanations
 * @param {object} params.resultExplanation - Result explanation
 * @param {object[]} params.stacks - Action stacks
 * @param {number} params.availableAreaSqm - Available area in square meters
 * @param {number} params.totalValidLandCoverSqm - Total valid land cover area
 * @param {number} params.availableAreaHectares - Available area in hectares
 * @returns {AvailableAreaForAction} Complete available area result
 */
function buildFinalResult({
  initialExplanations,
  totalValidLandCoverExplanations,
  filterExplanations,
  incompatibleLandCoverExplanations,
  stackExplanations,
  resultExplanation,
  stacks,
  availableAreaSqm,
  totalValidLandCoverSqm,
  availableAreaHectares
}) {
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
 * Main function to get available area for an action
 * @param {string} actionCodeAppliedFor - The action code being applied for
 * @param {string} sheetId - The sheet ID
 * @param {string} parcelId - The parcel ID
 * @param {CompatibilityCheckFn} compatibilityCheckFn - Compatibility check function
 * @param {Action[]} existingActions - The list of existing actions
 * @param {AvailableAreaDataRequirements} availableAreaDataRequirements - Data requirements
 * @param {Logger} logger - The logger object
 * @returns {AvailableAreaForAction} Available area calculation results
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
  logInfo(logger, {
    category: 'aac',
    message: 'Getting available area for action',
    context: {
      actionCodeAppliedFor,
      parcelId,
      sheetId
    }
  })

  const {
    landCoverCodesForAppliedForAction,
    landCoversForParcel,
    landCoversForExistingActions,
    landCoverToString
  } = availableAreaDataRequirements

  const initialExplanations = getInitialExplanations(
    actionCodeAppliedFor,
    sheetId,
    parcelId,
    landCoversForParcel,
    existingActions,
    landCoverCodesForAppliedForAction,
    landCoverToString
  )

  const {
    mergedLandCoverCodesForAppliedForAction,
    totalValidLandCoverSqm,
    totalValidLandCoverExplanations
  } = processLandCoverData({
    landCoversForParcel,
    landCoverCodesForAppliedForAction,
    landCoverToString,
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
    landCoversForExistingActions,
    mergedLandCoverCodesForAppliedForAction,
    landCoverToString,
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
  } = processStackingAndCalculateArea(
    revisedActions,
    compatibilityCheckFn,
    actionCodeAppliedFor,
    totalValidLandCoverSqm,
    logger
  )

  return buildFinalResult({
    initialExplanations,
    totalValidLandCoverExplanations,
    filterExplanations,
    incompatibleLandCoverExplanations,
    stackExplanations,
    resultExplanation,
    stacks,
    availableAreaSqm,
    totalValidLandCoverSqm,
    availableAreaHectares
  })
}

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

/**
 * @import { Action, CompatibilityCheckFn, AvailableAreaDataRequirements, ActionWithArea, StackResult, CodeToString, ProcessedLandCoverData, AvailableAreaForAction } from './available-area.d.js'
 * @import { Pool } from '~/src/features/common/postgres.d.js'
 * @import { Logger } from '~/src/features/common/logger.d.js'
 * @import { LandCover } from '~/src/features/parcel/parcel.d.js'
 * @import { LandCoverCodes } from '~/src/features/land-cover-codes/land-cover-codes.d.js'
 * @import { ExplanationSection } from '~/src/features/available-area/explanations.d.js'
 */
