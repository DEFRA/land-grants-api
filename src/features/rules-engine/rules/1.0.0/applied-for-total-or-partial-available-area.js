import {
  haToSqm,
  sqmToHaRounded
} from '~/src/features/common/helpers/measurement.js'

/**
 * @import { RuleEngineApplication } from '~/src/features/rules-engine/rules.d.js'
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
      areaAppliedFor: areaAppliedForHa,
      landParcel: { availableAreaSqm }
    } = application
    const name = rule.name

    const parsedAppliedAreaHa = Number.parseFloat(areaAppliedForHa) || 0
    const parsedAvailableAreaHa = sqmToHaRounded(availableAreaSqm) || 0
    const maximumAllowedAppliedAreaHa = parsedAvailableAreaHa

    const parsedAppliedAreaSqm = haToSqm(parsedAppliedAreaHa)
    const maximumAllowedAppliedAreaSqm = haToSqm(maximumAllowedAppliedAreaHa)

    const explanations = [
      {
        title: 'Total or partial available area',
        lines: [
          `The available area is (${parsedAvailableAreaHa} ha), and the applicant applied for (${parsedAppliedAreaHa} ha).`
        ]
      }
    ]

    if (
      parsedAppliedAreaSqm <= 0 ||
      parsedAppliedAreaSqm > maximumAllowedAppliedAreaSqm
    ) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: `The amount of land must be the same as or less than the available area`,
        explanations
      }
    }

    return {
      name,
      passed: true,
      description: rule.description,
      reason: `The applied figure (${parsedAppliedAreaHa} ha) is within the allowed range (greater than 0 ha and up to ${maximumAllowedAppliedAreaHa} ha)`,
      explanations
    }
  }
}
