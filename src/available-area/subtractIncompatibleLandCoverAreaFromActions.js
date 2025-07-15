import { mergeLandCoverCodes } from '../api/land-cover-codes/services/merge-land-cover-codes.js'

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
 * @param {LandCover[]} landCoversForParcel
 * @param {object} landCoversForExistingActions
 * @param {string[]} landCoverCodesForAppliedForAction
 * @param {object} logger
 * @returns
 */
export const subtractIncompatibleLandCoverAreaFromActions = (
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
 * @import { Action } from './available-area.d.js'
 * @import { LandCover } from '../api/parcel/parcel.d.js'
 */
