import { mergeLandCoverCodes } from '../api/land-cover-codes/services/merge-land-cover-codes.js'

/**
 * Filter existing actions to find those that share at least one land cover code
 * with the applied for action.
 * @param {Action[]} existingActions - The list of existing actions
 * @param {{[key:string]: LandCoverCodes[]}} landCoversForExistingActions - Land cover codes information for existing actions
 * @param {string[]} landCoverCodesForAppliedForAction - The land cover codes for the action being applied for
 * @param {object} logger - The logger object
 * @returns {Action[]} - A list of existing actions that share land cover codes
 */
export function filterActionsWithCommonLandCover(
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
 * @import { Action} from './available-area.d.js'
 * @import { LandCoverCodes } from '~/src/api/land-cover-codes/land-cover-codes.d.js'
 */
