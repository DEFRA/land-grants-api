import { mergeLandCoverCodes } from '../api/land-cover-codes/services/merge-land-cover-codes.js'
import { createExplanationSection } from './explanations.js'

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
 * @returns {{result: Action[], explanations: ExplanationSection }}
 */
export const subtractIncompatibleLandCoverAreaFromActions = (
  actions,
  landCoversForParcel,
  landCoversForExistingActions,
  landCoverCodesForAppliedForAction,
  logger
) => {
  const explanations = []
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

    explanations.push(
      `${action.actionCode}: ${revisedArea < 0 ? 0 : revisedArea} sqm`
    )
    revisedActions.push({
      ...action,
      areaSqm: revisedArea < 0 ? 0 : revisedArea
    })
  }

  return {
    result: revisedActions,
    explanations: createExplanationSection(
      `Actions included for stacking`,
      explanations
    )
  }
}

/**
 * @import { Action } from './available-area.d.js'
 * @import { ExplanationSection } from './explanations.d.js'
 * @import { LandCover } from '../api/parcel/parcel.d.js'
 */
