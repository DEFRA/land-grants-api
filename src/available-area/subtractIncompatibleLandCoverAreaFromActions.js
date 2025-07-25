import { mergeLandCoverCodes } from '../api/land-cover-codes/services/merge-land-cover-codes.js'
import { aacExplain, createExplanationSection } from './explanations.js'

/**
 * Explanation message generators for total calculation operations
 */
const explain = {
  /**
   * Generates explanation for action with incompatible land covers
   * @param {string} sheetId
   * @param {string} parcelId
   * @param {string} actionCode
   * @param {string} actionCodeAppliedFor
   * @returns {string} Explanation message
   */
  actionMayBeApplied: (sheetId, parcelId, actionCode, actionCodeAppliedFor) =>
    `${actionCode} may be applied on the following land cover on ${parcelId} ${sheetId} that aren't valid for ${actionCodeAppliedFor}:`,

  findAreaOfExistingAction: (actionCodeAppliedFor) =>
    `Find area of existing action that must be on the same land cover as ${actionCodeAppliedFor}`
}

/**
 * Calculates not common land covers total area, based on parcel covers that are present on existing action codes but are not in common with appliedActionCodes
 * @param {LandCover[]} parcelCovers
 * @param {string[]} existingActionCodes
 * @param {string[]} appliedActionCodes
 * @param {CodeToString} landCoverToString
 * @returns
 */
const calculateNotCommonLandCoversTotalArea = (
  parcelCovers,
  existingActionCodes,
  appliedActionCodes,
  landCoverToString
) => {
  const explanations = []
  const result = parcelCovers
    .filter((cover) => {
      if (
        existingActionCodes.includes(cover.landCoverClassCode) &&
        !appliedActionCodes.includes(cover.landCoverClassCode)
      ) {
        explanations.push(
          aacExplain.landCoverClassCodeInfoAndArea(
            cover.landCoverClassCode,
            cover.areaSqm,
            landCoverToString
          )
        )
        return true
      }
      return false
    })
    .reduce((total, cover) => total + cover.areaSqm, 0)

  return {
    result,
    explanations
  }
}

/**
 *
 * @param {string} parcelId
 * @param {string} sheetId
 * @param {string} actionCodeAppliedFor
 * @param {Action[]} actions
 * @param {LandCover[]} landCoversForParcel
 * @param {object} landCoversForExistingActions
 * @param {string[]} landCoverCodesForAppliedForAction
 * @param {CodeToString} landCoverToString
 * @param {object} logger
 * @returns
 */
export const subtractIncompatibleLandCoverAreaFromActions = (
  parcelId,
  sheetId,
  actionCodeAppliedFor,
  actions,
  landCoversForParcel,
  landCoversForExistingActions,
  landCoverCodesForAppliedForAction,
  landCoverToString,
  logger
) => {
  const revisedActions = []
  const explanations = []

  for (const action of actions) {
    const landCoverCodesForExistingAction = mergeLandCoverCodes(
      landCoversForExistingActions[action.actionCode]
    )

    const {
      result: totalAreaNotInCommon,
      explanations: calculateExplanations
    } = calculateNotCommonLandCoversTotalArea(
      landCoversForParcel,
      landCoverCodesForExistingAction,
      landCoverCodesForAppliedForAction,
      landCoverToString
    )

    if (totalAreaNotInCommon > 0) {
      explanations.push(
        '',
        explain.actionMayBeApplied(
          parcelId,
          sheetId,
          action.actionCode,
          actionCodeAppliedFor
        ),
        ...calculateExplanations
      )
    }

    logger.info(
      `totalAreaNotInCommon = ${totalAreaNotInCommon} - landCoversForParcel: ${JSON.stringify(landCoversForParcel)} - landCoverCodesForExistingAction ${JSON.stringify(landCoversForExistingActions[action.actionCode])}: landCoverCodesForAppliedForAction: ${JSON.stringify(landCoverCodesForAppliedForAction)}}`
    )

    const revisedArea = action.areaSqm - totalAreaNotInCommon
    revisedActions.push({
      ...action,
      areaSqm: revisedArea < 0 ? 0 : revisedArea
    })
  }

  return {
    result: revisedActions,
    explanations: createExplanationSection(
      explain.findAreaOfExistingAction(actionCodeAppliedFor),
      explanations
    )
  }
}

/**
 * @import { Action, CodeToString } from './available-area.d.js'
 * @import { LandCover } from '../api/parcel/parcel.d.js'
 */
