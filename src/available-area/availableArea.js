import { getLandCoversForAction } from '../api/land-cover-codes/queries/getLandCoversForAction.query.js'
import { mergeLandCoverCodes } from '../api/land-cover-codes/services/merge-land-cover-codes.js'
import { getParcelAvailableArea } from '../api/parcel/queries/getParcelAvailableArea.query.js'
import { calculateAvailableArea } from './calculateAvailableArea.js'

export async function getAvailableAreaForAction(
  action,
  sheetId,
  parcelId,
  compatibilityCheckFn,
  existingActions,
  postgresDb,
  logger
) {
  logger.info(
    `Getting actionAvailableArea for action: ${action.code} for parcel: ${sheetId}-${parcelId}`
  )

  const landCoverCodes = await getLandCoversForAction(
    action.code,
    postgresDb,
    logger
  )

  const landCoverCodesForAppliedForAction = mergeLandCoverCodes(landCoverCodes)

  logger.info(
    `Found ${landCoverCodesForAppliedForAction.length} landCoverCodesForAppliedForAction for action: ${action.code} for parcel: ${sheetId}-${parcelId}: ${JSON.stringify(
      landCoverCodesForAppliedForAction
    )}`
  )

  const totalValidLandCoverSqm = await getParcelAvailableArea(
    sheetId,
    parcelId,
    landCoverCodesForAppliedForAction,
    postgresDb,
    logger
  )

  logger.info(
    `totalValidLandCoverSqm ${totalValidLandCoverSqm} for action: ${action.code} for parcel: ${sheetId}-${parcelId}`
  )

  const existingActionsWithLandCoverInCommonWithAppliedForAction =
    await filterActionsWithLandCoverInCommon(
      existingActions || [],
      landCoverCodesForAppliedForAction,
      postgresDb,
      logger
    )

  const availableArea = calculateAvailableArea(
    existingActionsWithLandCoverInCommonWithAppliedForAction,
    { code: action.code },
    totalValidLandCoverSqm,
    compatibilityCheckFn
  )

  logger.info(
    `availableArea ${availableArea.availableAreaHectares} for action: ${action.code} for parcel: ${sheetId}-${parcelId}`
  )

  return availableArea
}

/**
 * Filter existing actions to find those that share at least one land cover code
 * with the applied for action.
 * @param {string[]} existingActions - The list of existing actions
 * @param {string[]} landCoverCodesForAppliedForAction - The land cover codes for the action being applied for
 * @param {object} postgresDb - The database connection object
 * @param {object} logger - The logger object
 * @returns {Promise<string[]>} - A list of existing actions that share land cover codes
 */
async function filterActionsWithLandCoverInCommon(
  existingActions,
  landCoverCodesForAppliedForAction,
  postgresDb,
  logger
) {
  const actionsWithLandCoverInCommon = []

  for (const action of existingActions) {
    const actionLandCoverCodes = await getLandCoversForAction(
      action.code,
      postgresDb,
      logger
    )
    const mergedLandCoverCodesForAppliedForExistingAction =
      mergeLandCoverCodes(actionLandCoverCodes)

    logger.info(
      `filterActionsWithLandCoverInCommon - Found ${mergedLandCoverCodesForAppliedForExistingAction.length} for action: ${action.code}: ${JSON.stringify(
        mergedLandCoverCodesForAppliedForExistingAction
      )}`
    )

    const hasLandCoverInCommon =
      mergedLandCoverCodesForAppliedForExistingAction.some((code) =>
        landCoverCodesForAppliedForAction.includes(code)
      )

    if (hasLandCoverInCommon) {
      actionsWithLandCoverInCommon.push(action)
    }
  }

  return actionsWithLandCoverInCommon
}
