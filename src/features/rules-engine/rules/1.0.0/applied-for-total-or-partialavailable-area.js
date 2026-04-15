/**
 * @import { RuleEngineApplication, RuleResultItem } from '~/src/features/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/features/actions/action.d.js'
 */

/**
 * @param {RuleEngineApplication} application - The application to execute the rule on
 * @param {ActionRule} rule - The rule to execute
 * @returns {RuleResultItem} - The result of the rule
 */
export const appliedForTotalOrPartialavailableArea = {
  execute: (application, rule) => {
    const {
      areaAppliedFor,
      landParcel: { area: availableArea }
    } = application
    const { minimumAppliedHa } = rule.config
    const name = rule.name

    const parsedAppliedArea = Number.parseFloat(areaAppliedFor)
    const parsedAvailableArea = Number.parseFloat(availableArea)
    const parsedMinimumAppliedArea = Number.parseFloat(minimumAppliedHa)

    const explanations = [
      {
        title: 'Total or partial available area',
        lines: [
          `The minimum allowed applied area is (${parsedMinimumAppliedArea} ha), the available area is (${parsedAvailableArea} ha), the applicant applied for (${parsedAppliedArea} ha)`
        ]
      }
    ]

    if (
      Number.isNaN(parsedAppliedArea) ||
      Number.isNaN(parsedAvailableArea) ||
      Number.isNaN(parsedMinimumAppliedArea)
    ) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason:
          'Area values required to validate the total or partial available area rule are missing or invalid',
        explanations
      }
    }

    if (parsedAppliedArea < parsedMinimumAppliedArea) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: `The applied figure (${parsedAppliedArea} ha) is below the minimum allowed area (${parsedMinimumAppliedArea} ha)`,
        explanations
      }
    }

    if (parsedAppliedArea > parsedAvailableArea) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: `There is not sufficient available area (${parsedAvailableArea} ha) for the applied figure (${parsedAppliedArea} ha)`,
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
