import {
  haToSqm,
  sqmToHaRounded
} from '~/src/features/common/helpers/measurement.js'

/**
 * @import { RuleEngineApplication } from '~/src/features/rules-engine/rules.d.js'
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
      landParcel: { availableAreaSqm }
    } = application

    const areaAppliedForHa = Number.parseFloat(areaAppliedFor)
    const availableAreaHa = sqmToHaRounded(availableAreaSqm)
    const areaAppliedForSqm = haToSqm(areaAppliedForHa)

    const name = rule.name
    const explanations = [
      {
        title: 'Total valid land cover',
        lines: [
          `The available area was (${availableAreaHa} ha) the applicant applied for (${areaAppliedFor} ha)`
        ]
      }
    ]

    if (areaAppliedForSqm !== availableAreaSqm) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: `There is not sufficient available area (${availableAreaHa} ha) for the applied figure (${areaAppliedForHa} ha)`,
        explanations
      }
    }

    return {
      name,
      passed: true,
      description: rule.description,
      reason: `There is sufficient available area (${availableAreaHa} ha) for the applied figure (${areaAppliedForHa} ha)`,
      explanations
    }
  }
}
