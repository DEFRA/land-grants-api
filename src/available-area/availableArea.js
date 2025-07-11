import { getLandCoversForAction } from '../api/land-cover-codes/queries/getLandCoversForAction.query.js'
import { mergeLandCoverCodes } from '../api/land-cover-codes/services/merge-land-cover-codes.js'
import { getLandCoversForParcel } from '../api/parcel/queries/getLandCoversForParcel.query.js'
import { calculateAvailableArea } from './calculateAvailableArea.js'

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

  const landCoverCodes = await getLandCoversForAction(
    actionCodeAppliedFor,
    postgresDb,
    logger
  )

  const landCoverCodesForAppliedForAction = mergeLandCoverCodes(landCoverCodes)

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

  const totalValidLandCoverSqm = landCoversForParcel.reduce((total, cover) => {
    if (landCoverCodesForAppliedForAction.includes(cover.landCoverClassCode)) {
      return total + cover.areaSqm
    }
    return total
  }, 0)

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
    const actionLandCoverCodes = await getLandCoversForAction(
      existingAction.actionCode,
      postgresDb,
      logger
    )
    const mergedLandCoverCodesExistingAction =
      mergeLandCoverCodes(actionLandCoverCodes)

    logger.info(
      `filterActionsWithLandCoverInCommon - Found ${mergedLandCoverCodesExistingAction.length} for action: ${existingAction.actionCode}: ${JSON.stringify(
        mergedLandCoverCodesExistingAction
      )}`
    )

    const hasLandCoverInCommon = mergedLandCoverCodesExistingAction.some(
      (code) => landCoverCodesForAppliedForAction.includes(code)
    )

    if (hasLandCoverInCommon) {
      const landCoversNotInCommonWithAppliedForAction =
        landCoversForParcel.filter(
          (cover) =>
            mergedLandCoverCodesExistingAction.includes(
              cover.landCoverClassCode
            ) &&
            !landCoverCodesForAppliedForAction.includes(
              cover.landCoverClassCode
            )
        )

      const totalAreaNotInCommon =
        landCoversNotInCommonWithAppliedForAction.reduce(
          (total, cover) => total + cover.areaSqm,
          0
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
