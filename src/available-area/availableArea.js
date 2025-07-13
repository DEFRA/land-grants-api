import { getLandCoversForAction } from '../api/land-cover-codes/queries/getLandCoversForAction.query.js'
import { mergeLandCoverCodes } from '../api/land-cover-codes/services/merge-land-cover-codes.js'
import { getLandCoversForParcel } from '../api/parcel/queries/getLandCoversForParcel.query.js'
import { calculateAvailableArea } from './calculateAvailableArea.js'

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
 *
 * @param {string} actionCodeAppliedFor
 * @param {string} sheetId
 * @param {string} parcelId
 * @param {CompatibilityCheckFn} compatibilityCheckFn
 * @param {Action[]} existingActions
 * @param {object} postgresDb
 * @param {object} logger
 * @returns
 */
export async function getAvailableAreaForAction(
  actionCodeAppliedFor,
  sheetId,
  parcelId,
  compatibilityCheckFn,
  existingActions,
  postgresDb,
  logger
) {
  logger.info(
    `Getting available area for action: ${actionCodeAppliedFor} for parcel: ${sheetId}-${parcelId}`
  )

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

  const totalValidLandCoverSqm = calculateTotalValidLandCoverArea(
    landCoversForParcel,
    landCoverCodesForAppliedForAction
  )

  logger.info(
    `totalValidLandCoverSqm ${totalValidLandCoverSqm} for action: ${actionCodeAppliedFor} for parcel: ${sheetId}-${parcelId}`
  )

  const existingActionsWithLandCoverInCommonWithAppliedForAction =
    await filterActionsWithLandCoverInCommon(
      existingActions || [],
      landCoverCodesForAppliedForAction,
      landCoversForParcel,
      postgresDb,
      logger
    )

  logger.info(
    `existingActionsWithLandCoverInCommonWithAppliedForAction ${JSON.stringify(existingActionsWithLandCoverInCommonWithAppliedForAction)}`
  )

  const availableArea = calculateAvailableArea(
    existingActionsWithLandCoverInCommonWithAppliedForAction,
    actionCodeAppliedFor,
    totalValidLandCoverSqm,
    compatibilityCheckFn
  )

  logger.info(
    `availableArea ${availableArea.availableAreaHectares} for action: ${actionCodeAppliedFor} for parcel: ${sheetId}-${parcelId}`
  )

  return availableArea
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
 * Filter existing actions to find those that share at least one land cover code
 * with the applied for action.
 * @param {Action[]} existingActions - The list of existing actions
 * @param {string[]} landCoverCodesForAppliedForAction - The land cover codes for the action being applied for
 * @param {LandCover[]} landCoversForParcel - The land cover codes for the parcel
 * @param {object} postgresDb - The database connection object
 * @param {object} logger - The logger object
 * @returns {Promise<Action[]>} - A list of existing actions that share land cover codes
 */
async function filterActionsWithLandCoverInCommon(
  existingActions,
  landCoverCodesForAppliedForAction,
  landCoversForParcel,
  postgresDb,
  logger
) {
  const actionsWithLandCoverInCommon = []

  for (const existingAction of existingActions) {
    const landCoverCodesForExistingAction = mergeLandCoverCodes(
      await getLandCoversForAction(
        existingAction.actionCode,
        postgresDb,
        logger
      )
    )

    logger.info(
      `filterActionsWithLandCoverInCommon - Found ${landCoverCodesForExistingAction.length} land cover codes for action: ${existingAction.actionCode}: ${JSON.stringify(
        landCoverCodesForExistingAction
      )}`
    )

    const hasLandCoverInCommon = landCoverCodesForExistingAction.some((code) =>
      landCoverCodesForAppliedForAction.includes(code)
    )

    if (hasLandCoverInCommon) {
      const totalAreaNotInCommon = calculateNotCommonLandCoversTotalArea(
        landCoversForParcel,
        landCoverCodesForExistingAction,
        landCoverCodesForAppliedForAction
      )

      logger.info(
        `totalAreaNotInCommon = ${totalAreaNotInCommon} - landCoversForParcel: ${JSON.stringify(landCoversForParcel)} - landCoverCodesForExistingAction ${JSON.stringify(landCoverCodesForExistingAction)}: landCoverCodesForAppliedForAction: ${JSON.stringify(landCoverCodesForAppliedForAction)}}`
      )

      const revisedArea = existingAction.areaSqm - totalAreaNotInCommon

      const existingActionWithRevisedArea = {
        ...existingAction,
        areaSqm: revisedArea < 0 ? 0 : revisedArea
      }

      actionsWithLandCoverInCommon.push(existingActionWithRevisedArea)
    }
  }

  return actionsWithLandCoverInCommon
}

/**
 * @import { Action, CompatibilityCheckFn } from './available-area.d.js'
 * @import { LandCover } from '../api/parcel/parcel.d.js'
 */
