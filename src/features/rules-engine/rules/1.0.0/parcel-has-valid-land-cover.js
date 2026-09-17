/**
 * @import { RuleEngineApplication, RuleResultItem } from '~/src/features/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/features/actions/action.d.js'
 */

export const parcelHasValidLandCover = {
  /**
   * @param {RuleEngineApplication} application - The application to execute the rule on
   * @param {ActionRule} rule - The rule to execute
   * @returns {RuleResultItem} - The result of the rule
   */
  execute: (application, rule) => {
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
        reason: 'Rule requires action and parcel land covers',
        explanations
      }
    }

    const hasValidLandCover = actionLandCovers.every((actionLandCover) => {
      return landCovers.some((landCover) => {
        return (
          landCover.landCoverClassCode === actionLandCover.landCoverClassCode &&
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
      reason: 'Parcel does not have valid land covers for this action',
      explanations
    }
  }
}
