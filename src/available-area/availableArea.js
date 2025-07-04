import { getLandCoverCodesForCodes } from '../api/land-cover-codes/queries/getLandCoverCodes.query.js'
import { getParcelAvailableArea } from '../api/parcel/queries/getParcelAvailableArea.query.js'
import { actionTransformer } from '../api/parcel/transformers/parcelActions.transformer.js'
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
  const transformed = actionTransformer(action)
  logger.info(`transformed: ${JSON.stringify(transformed)}`)

  logger.info(
    `Getting actionAvailableArea for action: ${action.code} for parcel: ${sheetId}-${parcelId}`
  )

  const landCoverCodes = await getLandCoverCodesForCodes(
    action.landCoverClassCodes,
    logger
  )
  logger.info(
    `Found ${landCoverCodes.length} landCoverCodes for action: ${action.code} for parcel: ${sheetId}-${parcelId}`
  )

  const totalValidLandCoverSqm = await getParcelAvailableArea(
    sheetId,
    parcelId,
    landCoverCodes,
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
