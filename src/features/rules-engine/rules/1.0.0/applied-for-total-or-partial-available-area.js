/**
 * @import { RuleEngineApplication, RuleResultItem } from '~/src/features/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/features/actions/action.d.js'
 */

// This rule allows applying for a partial or total area up to available area.

/**
 * @param {RuleEngineApplication} application - The application to execute the rule on
 * @param {ActionRule} rule - The rule to execute
 * @returns {RuleResultItem} - The result of the rule
 */
export const appliedForTotalOrPartialAvailableArea = {
  execute: (application, rule) => {
    const {
      areaAppliedFor,
      landParcel: { area: availableArea }
    } = application
    const name = rule.name

    const parsedAppliedArea = Number.parseFloat(areaAppliedFor) || 0
    const parsedAvailableArea = Number.parseFloat(availableArea) || 0
    const maximumAllowedAppliedArea = parsedAvailableArea

    const explanations = [
      {
        title: 'Total or partial available area',
        lines: [
          `The available area is (${parsedAvailableArea} ha), and the applicant applied for (${parsedAppliedArea} ha).`
        ]
      }
    ]

    if (
      parsedAppliedArea <= 0 ||
      parsedAppliedArea > maximumAllowedAppliedArea
    ) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: `The applied figure (${parsedAppliedArea} ha) must be greater than 0 ha and no more than (${maximumAllowedAppliedArea} ha), based on (${parsedAvailableArea} ha)`,
        explanations
      }
    }

    return {
      name,
      passed: true,
      description: rule.description,
      reason: `The applied figure (${parsedAppliedArea} ha) is within the allowed range (greater than 0 ha and up to ${maximumAllowedAppliedArea} ha)`,
      explanations
    }
  }
}
