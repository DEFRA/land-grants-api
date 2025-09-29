/**
 * @import { RuleEngineApplication } from '~/src/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/api/actions/action.d.js'
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
          'Applied for total available area',
          `Applied for: ${parseFloat(areaAppliedFor)} ha`,
          `Parcel area: ${parseFloat(area)} ha`
        ]
      }
    ]

    if (parseFloat(areaAppliedFor) !== parseFloat(area)) {
      return {
        name,
        passed: false,
        reason: `There is not sufficient available area (${parseFloat(area)} ha) for the applied figure (${parseFloat(areaAppliedFor)} ha)`,
        explanations
      }
    }

    return {
      name,
      passed: true,
      reason: `There is sufficient available area (${parseFloat(area)} ha) for the applied figure (${parseFloat(areaAppliedFor)} ha)`,
      explanations
    }
  }
}
