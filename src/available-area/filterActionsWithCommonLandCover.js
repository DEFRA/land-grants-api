import { mergeLandCoverCodes } from '../api/land-cover-codes/services/merge-land-cover-codes.js'
import { createExplanationSection } from './explanations.js'

/**
 * Filter existing actions to find those that share at least one land cover code
 * with the applied for action.
 * @param {Action[]} existingActions - The list of existing actions
 * @param {{[key:string]: LandCoverCodes[]}} landCoversForExistingActions - Land cover codes information for existing actions
 * @param {string[]} landCoverCodesForAppliedForAction - The land cover codes for the action being applied for
 * @param {object} logger - The logger object
 * @returns {{result: Action[], explanations: ExplanationSection}} - A list of existing actions that share land cover codes
 */
export function filterActionsWithCommonLandCover(
  existingActions,
  landCoversForExistingActions,
  landCoverCodesForAppliedForAction,
  logger
) {
  let landCoversInCommon = []
  const actionsWithLandCoverInCommon = []
  for (const existingAction of existingActions) {
    landCoversInCommon = getLandCoversInCommonForAction(
      existingAction,
      landCoversForExistingActions,
      landCoverCodesForAppliedForAction,
      logger
    )
    if (landCoversInCommon.length > 0) {
      actionsWithLandCoverInCommon.push(existingAction)
    }
  }

  return {
    result: actionsWithLandCoverInCommon,
    explanations: createExplanationSection(`Common land covers`, [
      `Land covers in common with applied action: `,
      ...landCoversInCommon
    ])
  }
}

function getLandCoversInCommonForAction(
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

  return landCoverCodesForExistingAction.filter((code) =>
    landCoverCodesForAppliedForAction.includes(code)
  )
}

/**
 * @import { Action} from './available-area.d.js'
 * @import { ExplanationSection} from './explanations.d.js'
 * @import { LandCoverCodes } from '~/src/api/land-cover-codes/land-cover-codes.d.js'
 */
