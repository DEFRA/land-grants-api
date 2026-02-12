import { mergeLandCoverCodes } from '~/src/features/land-cover-codes/services/merge-land-cover-codes.js'

/**
 * @import { Action, CodeToString } from './available-area.d.js'
 * @import { LandCoverCodes } from '~/src/features/land-cover-codes/land-cover-codes.d.js'
 * @import { ExplanationSection } from './explanations.d.js'
 */

/**
 * Filter existing actions to find those that share at least one land cover code
 * with the applied for action.
 * @param {Action[]} existingActions - The list of existing actions
 * @param {{[key:string]: LandCoverCodes[]}} landCoversForExistingActions - Land cover codes information for existing actions
 * @param {string[]} landCoverCodesForAppliedForAction - The land cover codes for the action being applied for
 * @param {CodeToString} landCoverToString
 * @returns {{existingActionsWithLandCoverInCommonWithAppliedForAction: Action[], explanationSection: ExplanationSection}}} - A list of existing actions that share land cover codes
 */
export function filterActionsWithCommonLandCover(
  existingActions,
  landCoversForExistingActions,
  landCoverCodesForAppliedForAction,
  landCoverToString
) {
  const actionsWithLandCoverInCommon = []
  const explanations = []
  for (const existingAction of existingActions) {
    const { hasLandCoverInCommon, explanations: commonExplanations } =
      actionHasLandCoverInCommon(
        existingAction,
        landCoversForExistingActions,
        landCoverCodesForAppliedForAction,
        landCoverToString
      )

    explanations.push(...commonExplanations)

    if (hasLandCoverInCommon) {
      actionsWithLandCoverInCommon.push(existingAction)
    }
  }

  explanations.push('', 'Actions included for stacking:', '')

  if (actionsWithLandCoverInCommon.length === 0) {
    explanations.push('None')
  }

  for (const action of actionsWithLandCoverInCommon) {
    explanations.push(`- ${action.actionCode}`)
  }

  return {
    existingActionsWithLandCoverInCommonWithAppliedForAction:
      actionsWithLandCoverInCommon,
    explanationSection: { title: 'Common land covers', content: explanations }
  }
}

/**
 *
 * @param {Action} existingAction
 * @param {{[key:string]: LandCoverCodes[]}} landCoversForExistingActions
 * @param {string[]} landCoverCodesForAppliedForAction
 * @param {CodeToString} landCoverToString
 * @returns
 */
function actionHasLandCoverInCommon(
  existingAction,
  landCoversForExistingActions,
  landCoverCodesForAppliedForAction,
  landCoverToString
) {
  const landCoverCodesForExistingAction = mergeLandCoverCodes(
    landCoversForExistingActions[existingAction.actionCode]
  )

  const commonLandCoverCodes = landCoverCodesForExistingAction.filter((code) =>
    landCoverCodesForAppliedForAction.includes(code)
  )

  const explanation = `${existingAction.actionCode} has the following valid land covers in common with the applied for action: `
  const coverCodeDescriptions = commonLandCoverCodes.map(
    (c) => `- ${landCoverToString(c, true)}`
  )

  return {
    hasLandCoverInCommon: commonLandCoverCodes.length > 0,
    explanations: [explanation, ...coverCodeDescriptions]
  }
}
