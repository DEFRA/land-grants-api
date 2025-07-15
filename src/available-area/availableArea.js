import { getLandCoversForAction } from '../api/land-cover-codes/queries/getLandCoversForAction.query.js'
import { mergeLandCoverCodes } from '../api/land-cover-codes/services/merge-land-cover-codes.js'
import { getLandCoversForParcel } from '../api/parcel/queries/getLandCoversForParcel.query.js'
import { sqmToHaRounded } from '~/src/api/common/helpers/measurement.js'
import { stackActions } from './stackActions.js'
import { subtractIncompatibleStacks } from './subtractIncompatibleStacks.js'

/**
 * Calculates total valid land cover area, based on an array of LandCovers and a list of allowed codes
 * @param {LandCover[]} landCovers
 * @param {string[]} allowedCodes
 * @returns {number}
 */
const calculateTotalValidLandCoverArea = (landCovers, allowedCodes) =>
  landCovers.reduce(
    (total, cover) =>
      allowedCodes.includes(cover.landCoverClassCode)
        ? total + cover.areaSqm
        : total,
    0
  )

/**
 * @typedef {object} AvailableAreaDataRequirements
 * @property {string[]} landCoverCodesForAppliedForAction - The land cover codes for the action being applied for
 * @property {LandCover[]} landCoversForParcel - The land covers for the parcel
 * @property {{[key: string]: LandCover[]}} landCoversForExistingActions
 */

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
  const landCoverCodesForAppliedForAction = mergeLandCoverCodes(
    await getLandCoversForAction(actionCodeAppliedFor, postgresDb, logger)
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
    existingActions,
    postgresDb,
    logger
  )

  return {
    landCoverCodesForAppliedForAction,
    landCoversForParcel,
    landCoversForExistingActions
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
    landCoversForExistingActions
  } = availableAreaDataRequirements

  const totalValidLandCoverSqm = calculateTotalValidLandCoverArea(
    landCoversForParcel,
    landCoverCodesForAppliedForAction
  )

  logger.info(
    `totalValidLandCoverSqm ${totalValidLandCoverSqm} for action: ${actionCodeAppliedFor} for parcel: ${sheetId}-${parcelId}`
  )

  const existingActionsWithLandCoverInCommonWithAppliedForAction =
    filterActionsWithLandCoverInCommon(
      existingActions || [],
      landCoversForExistingActions,
      landCoverCodesForAppliedForAction,
      logger
    )

  logger.info(
    `existingActionsWithLandCoverInCommonWithAppliedForAction ${JSON.stringify(existingActionsWithLandCoverInCommonWithAppliedForAction)}`
  )

  const revisedActions = subtractIncompatibleLandCoverAreaFromActions(
    existingActionsWithLandCoverInCommonWithAppliedForAction,
    landCoversForParcel,
    landCoversForExistingActions,
    landCoverCodesForAppliedForAction,
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

  return {
    ...stackResponse,
    availableAreaSqm,
    totalValidLandCoverSqm,
    availableAreaHectares
  }
}

/**
 *
 * @param {Action[]} actions
 * @param {LandCover[]} landCoversForParcel
 * @param {object} landCoversForExistingActions
 * @param {string[]} landCoverCodesForAppliedForAction
 * @param {object} logger
 * @returns
 */
const subtractIncompatibleLandCoverAreaFromActions = (
  actions,
  landCoversForParcel,
  landCoversForExistingActions,
  landCoverCodesForAppliedForAction,
  logger
) => {
  const revisedActions = []
  for (const action of actions) {
    const landCoverCodesForExistingAction = mergeLandCoverCodes(
      landCoversForExistingActions[action.actionCode]
    )

    const totalAreaNotInCommon = calculateNotCommonLandCoversTotalArea(
      landCoversForParcel,
      landCoverCodesForExistingAction,
      landCoverCodesForAppliedForAction
    )

    logger.info(
      `totalAreaNotInCommon = ${totalAreaNotInCommon} - landCoversForParcel: ${JSON.stringify(landCoversForParcel)} - landCoverCodesForExistingAction ${JSON.stringify(landCoversForExistingActions[action.actionCode])}: landCoverCodesForAppliedForAction: ${JSON.stringify(landCoverCodesForAppliedForAction)}}`
    )

    const revisedArea = action.areaSqm - totalAreaNotInCommon

    revisedActions.push({
      ...action,
      areaSqm: revisedArea < 0 ? 0 : revisedArea
    })
  }

  return revisedActions
}

/**
 * Calculates not common land covers total area, based on parcel covers that are present on existing action codes but are not in common with appliedActionCodes
 * @param {LandCover[]} parcelCovers
 * @param {string[]} existingActionCodes
 * @param {string[]} appliedActionCodes
 * @returns
 */
const calculateNotCommonLandCoversTotalArea = (
  parcelCovers,
  existingActionCodes,
  appliedActionCodes
) =>
  parcelCovers
    .filter(
      (cover) =>
        existingActionCodes.includes(cover.landCoverClassCode) &&
        !appliedActionCodes.includes(cover.landCoverClassCode)
    )
    .reduce((total, cover) => total + cover.areaSqm, 0)

/**
 *
 * @param {Action[]} actions
 * @returns {Promise<{[key: string]: LandCover[]}>}
 */
async function getLandCoversForActions(actions, postgresDb, logger) {
  /** @type {{[key: string]: LandCoverCodes[]}} */
  const landCoversForActions = {}
  for (const action of actions) {
    landCoversForActions[action.actionCode] =
      // TODO: Pass array of actions so we process all actions at the same time
      await getLandCoversForAction(action.actionCode, postgresDb, logger)
  }
  return landCoversForActions
}

/**
 * Filter existing actions to find those that share at least one land cover code
 * with the applied for action.
 * @param {Action[]} existingActions - The list of existing actions
 * @param {{[key:string]: LandCoverCodes[]}} landCoversForExistingActions - Land cover codes information for existing actions
 * @param {string[]} landCoverCodesForAppliedForAction - The land cover codes for the action being applied for
 * @param {object} logger - The logger object
 * @returns {Action[]} - A list of existing actions that share land cover codes
 */
function filterActionsWithLandCoverInCommon(
  existingActions,
  landCoversForExistingActions,
  landCoverCodesForAppliedForAction,
  logger
) {
  const actionsWithLandCoverInCommon = []
  for (const existingAction of existingActions) {
    const hasLandCoverInCommon = actionHasLandCoverInCommon(
      existingAction,
      landCoversForExistingActions,
      landCoverCodesForAppliedForAction,
      logger
    )
    if (hasLandCoverInCommon) {
      actionsWithLandCoverInCommon.push(existingAction)
    }
  }

  return actionsWithLandCoverInCommon
}

function actionHasLandCoverInCommon(
  existingAction,
  landCoversForExistingActions,
  landCoverCodesForAppliedForAction,
  logger
) {
  const landCoverCodesForExistingAction = mergeLandCoverCodes(
    landCoversForExistingActions[existingAction.actionCode]
  )

  logger.info(
    `filterActionsWithLandCoverInCommon - Found ${landCoverCodesForExistingAction.length} land cover codes for action: ${existingAction.actionCode}: ${JSON.stringify(
      landCoverCodesForExistingAction
    )}`
  )

  const hasLandCoverInCommon = landCoverCodesForExistingAction.some((code) =>
    landCoverCodesForAppliedForAction.includes(code)
  )

  return hasLandCoverInCommon
}
/**
 * @import { Action, CompatibilityCheckFn } from './available-area.d.js'
 * @import { LandCover } from '../api/parcel/parcel.d.js'
 */
