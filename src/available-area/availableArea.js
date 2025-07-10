import { getLandCoversForAction } from '../api/land-cover-codes/queries/getLandCoversForAction.query.js'
import { getParcelAvailableArea } from '../api/parcel/queries/getParcelAvailableArea.query.js'
import { calculateAvailableArea } from './calculateAvailableArea.js'
import { mergeLandCoverCodes } from '../api/land-cover-codes/services/merge-land-cover-codes.js'

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

  const mergedLandCoverCodes = mergeLandCoverCodes(landCoverCodes)

  logger.info(
    `Found ${mergedLandCoverCodes.length} mergedLandCoverCodes for action: ${action.code} for parcel: ${sheetId}-${parcelId}`
  )

  const totalValidLandCoverSqm = await getParcelAvailableArea(
    sheetId,
    parcelId,
    mergedLandCoverCodes,
    postgresDb,
    logger
  )

  logger.info(
    `totalValidLandCoverSqm ${totalValidLandCoverSqm} for action: ${action.code} for parcel: ${sheetId}-${parcelId}`
  )

  const availableArea = calculateAvailableArea(
    existingActions || [],
    { code: action.code },
    totalValidLandCoverSqm,
    compatibilityCheckFn
  )

  logger.info(
    `availableArea ${availableArea.availableAreaHectares} for action: ${action.code} for parcel: ${sheetId}-${parcelId}`
  )

  return availableArea
}
