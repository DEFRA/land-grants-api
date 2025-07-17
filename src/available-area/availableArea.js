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

  return {
    landCoverCodesForAppliedForAction,
    landCoversForParcel,
    landCoversForExistingActions,
    landCoverDefinitions
  }
}

/**
 *
 * @param {string} actionCodeAppliedFor
 * @param {string} sheetId
 * @param {string} parcelId
 * @param {CompatibilityCheckFn} compatibilityCheckFn
 * @param {Action[]} existingActions
 * @param {AvailableAreaDataRequirements} availableAreaDataRequirements
 * @param {object} logger
 * @returns
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

  const {
    landCoverCodesForAppliedForAction,
    landCoversForParcel,
    landCoversForExistingActions,
    landCoverDefinitions
  } = availableAreaDataRequirements

  const initialExplanations = getInitialExplanations(
    actionCodeAppliedFor,
    sheetId,
    parcelId,
    landCoversForParcel,
    existingActions,
    landCoverCodesForAppliedForAction,
    landCoverDefinitions
  )

  const mergedLandCoverCodesForAppliedForAction = mergeLandCoverCodes(
    landCoverCodesForAppliedForAction
  )
  const {
    result: totalValidLandCoverSqm
    // explanations: totalValidLandCoverExplanations
  } = calculateTotalValidLandCoverArea(
    landCoversForParcel,
    mergedLandCoverCodesForAppliedForAction,
    landCoverDefinitions
  )

  logger.info(
    `totalValidLandCoverSqm ${totalValidLandCoverSqm} for action: ${actionCodeAppliedFor} for parcel: ${sheetId}-${parcelId}`
  )

  const existingActionsWithLandCoverInCommonWithAppliedForAction =
    filterActionsWithCommonLandCover(
      existingActions || [],
      landCoversForExistingActions,
      mergedLandCoverCodesForAppliedForAction,
      logger
    )

  logger.info(
    `existingActionsWithLandCoverInCommonWithAppliedForAction ${JSON.stringify(existingActionsWithLandCoverInCommonWithAppliedForAction)}`
  )

  const revisedActions = subtractIncompatibleLandCoverAreaFromActions(
    existingActionsWithLandCoverInCommonWithAppliedForAction,
    landCoversForParcel,
    landCoversForExistingActions,
    mergedLandCoverCodesForAppliedForAction,
    logger
  )

  const stackResponse = stackActions(revisedActions, compatibilityCheckFn)

  // subtract areas of stacks where any action is not compatible
  const availableAreaSqm = subtractIncompatibleStacks(
    actionCodeAppliedFor,
    totalValidLandCoverSqm,
    stackResponse.stacks,
    compatibilityCheckFn
  )

  const availableAreaHectares = sqmToHaRounded(availableAreaSqm)

  logger.info(
    `availableArea ${availableAreaHectares} for action: ${actionCodeAppliedFor} for parcel: ${sheetId}-${parcelId}`
  )

  const explanations = [
    ...initialExplanations,
    // totalValidLandCoverExplanations,
    stackResponse.explanations
  ]
  return {
    stacks: stackResponse.stacks,
    explanations,
    availableAreaSqm,
    totalValidLandCoverSqm,
    availableAreaHectares
  }
}

/**
 * @import { Action, CompatibilityCheckFn, AvailableAreaDataRequirements } from './available-area.d.js'
 */
