/**
 * @import { RuleEngineApplication, RuleResultItem } from '~/src/features/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/features/actions/action.d.js'
 */

import { REQUIRED_RULE_DATA } from '../../services/requiredRuleData.js'

export const parcelHasValidLandCover = {
  requires: [
    { type: REQUIRED_RULE_DATA.LAND_COVERS },
    { type: REQUIRED_RULE_DATA.ACTION_LAND_COVERS }
  ],
  /**
   * @param {RuleEngineApplication} application - The application to execute the rule on
   * @param {ActionRule} rule - The rule to execute
   * @returns {RuleResultItem} - The result of the rule
   */
  execute: (application, rule) => {
    const defaultFailureMessage =
      "This land parcel doesn't have valid land covers"
    const failureMessage = rule.config?.failureMessage ?? defaultFailureMessage
    const { actionLandCovers, landParcel } = application
    const name = `${rule.name}`

    const landCovers = landParcel?.landCovers

    const explanations = [
      {
        title: `Parcel has valid land cover`,
        lines: []
      }
    ]

    if (!Array.isArray(actionLandCovers) || !Array.isArray(landCovers)) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: failureMessage,
        explanations
      }
    }

    const hasValidLandCover = actionLandCovers.every((actionLandCover) => {
      return landCovers.some((landCover) => {
        return (
          (landCover.landCoverClassCode ===
            actionLandCover.landCoverClassCode ||
            landCover.landCoverClassCode === actionLandCover.landCoverCode) &&
          landCover.areaSqm > 0
        )
      })
    })

    if (hasValidLandCover) {
      return {
        name,
        passed: true,
        description: rule.description,
        reason: 'Parcel has valid land cover',
        explanations
      }
    }

    return {
      name,
      passed: false,
      description: rule.description,
      reason: failureMessage,
      explanations
    }
  }
}
