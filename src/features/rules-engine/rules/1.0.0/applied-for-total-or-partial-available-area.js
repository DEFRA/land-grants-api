/**
 * @import { RuleEngineApplication, RuleResultItem } from '~/src/features/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/features/actions/action.d.js'
 */

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
    const { minimumAppliedHa } = rule.config
    const name = rule.name

    const parsedAppliedArea = Number.parseFloat(areaAppliedFor) || 0
    const parsedAvailableArea = Number.parseFloat(availableArea) || 0
    const parsedMinimumAppliedArea = Number.parseFloat(minimumAppliedHa) || 0

    const explanations = [
      {
        title: 'Total or partial available area',
        lines: [
          `The minimum allowed applied area is (${parsedMinimumAppliedArea} ha), the available area is (${parsedAvailableArea} ha), the applicant applied for (${parsedAppliedArea} ha)`
        ]
      }
    ]

    if (
      parsedAppliedArea < parsedMinimumAppliedArea ||
      parsedAppliedArea > parsedAvailableArea
    ) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: `The applied figure (${parsedAppliedArea} ha) must be between (${parsedMinimumAppliedArea} ha) and (${parsedAvailableArea} ha)`,
        explanations
      }
    }

    return {
      name,
      passed: true,
      description: rule.description,
      reason: `The applied figure (${parsedAppliedArea} ha) is within the allowed range (${parsedMinimumAppliedArea} ha to ${parsedAvailableArea} ha)`,
      explanations
    }
  }
}
