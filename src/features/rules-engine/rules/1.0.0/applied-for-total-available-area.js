/**
 * @import { RuleEngineApplication } from '~/src/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/features/actions/action.d.js'
 */

/**
 * @param {RuleEngineApplication} application - The application to execute the rule on
 * @param {ActionRule} rule - The rule to execute
 * @returns {RuleResultItem} - The result of the rule
 */
export const appliedForTotalAvailableArea = {
  execute: (application, rule) => {
    const {
      areaAppliedFor,
      landParcel: { area }
    } = application

    const name = rule.name
    const explanations = [
      {
        title: 'Total valid land cover',
        lines: [
          `The available area was (${Number.parseFloat(area)} ha) the applicant applied for (${Number.parseFloat(areaAppliedFor)} ha)`
        ]
      }
    ]

    if (Number.parseFloat(areaAppliedFor) !== Number.parseFloat(area)) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: `There is not sufficient available area (${Number.parseFloat(area)} ha) for the applied figure (${Number.parseFloat(areaAppliedFor)} ha)`,
        explanations
      }
    }

    return {
      name,
      passed: true,
      description: rule.description,
      reason: `There is sufficient available area (${Number.parseFloat(area)} ha) for the applied figure (${Number.parseFloat(areaAppliedFor)} ha)`,
      explanations
    }
  }
}
