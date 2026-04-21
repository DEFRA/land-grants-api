// Rule 1: woodland-minimum-eligibility

import {
  haToSqm,
  roundTo4DecimalPlaces
} from '~/src/features/common/helpers/measurement.js'

// There must be a minimum of 0.5ha of woodland over 10 years old on the holding. If this is not met,
// the applicant is not eligible and the calculator should reflect this.

// Test Cases:
// User enters 0.5ha of wood land over 10 years (validation pass)
// User enters 0.4ha of wood land over 10 years (validation fail, return error message)
// User doesn’t enter a value (return error message)

/**
 * @import { RuleEngineApplication } from '~/src/features/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/features/actions/action.d.js'
 */

/**
 * @param {RuleEngineApplication} application - The application to execute the rule on
 * @param {ActionRule} rule - The rule to execute
 * @returns {RuleResultItem} - The result of the rule
 */
export const woodlandMinimumEligibility = {
  execute: (application, rule) => {
    const { oldWoodlandAreaHa = 0, newWoodlandAreaHa = 0 } = application
    const { minimumSize: minimumSizeHa, minOldWoodlandPercent } = rule.config
    const name = rule.name

    const oldWoodlandAreaSqm = haToSqm(Number.parseFloat(oldWoodlandAreaHa))
    const newWoodlandAreaSqm = haToSqm(Number.parseFloat(newWoodlandAreaHa))
    const totalWoodlandAreaSqm = oldWoodlandAreaSqm + newWoodlandAreaSqm
    const oldWoodlandPercent = (oldWoodlandAreaSqm / totalWoodlandAreaSqm) * 100

    const minimumSizeSqm = haToSqm(Number.parseFloat(minimumSizeHa))
    const roundedTotalWoodlandAreaHa = roundTo4DecimalPlaces(
      Number.parseFloat(oldWoodlandAreaHa) +
        Number.parseFloat(newWoodlandAreaHa)
    )
    const roundedMinimumSizeHa = roundTo4DecimalPlaces(
      Number.parseFloat(minimumSizeHa)
    )

    const explanations = [
      {
        title: 'Woodland minimum eligibility',
        lines: [
          `The minimum required woodland area over 10 years old is (${roundedMinimumSizeHa} ha), the holding has (${roundedTotalWoodlandAreaHa} ha)`
        ]
      }
    ]

    if (!oldWoodlandAreaSqm) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: 'No woodland area over 10 years old has been provided',
        explanations
      }
    }

    if (oldWoodlandPercent < minOldWoodlandPercent) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: `The percentage of woodland over 10 years old (${oldWoodlandPercent}%) does not meet the minimum required (${minOldWoodlandPercent}%)`,
        explanations
      }
    }

    if (totalWoodlandAreaSqm < minimumSizeSqm) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: `The total woodland area (${roundedTotalWoodlandAreaHa} ha) does not meet the minimum required area of (${roundedMinimumSizeHa} ha)`,
        explanations
      }
    }

    return {
      name,
      passed: true,
      description: rule.description,
      reason: `The total woodland area (${roundedTotalWoodlandAreaHa} ha) meets the minimum required area of (${roundedMinimumSizeHa} ha)`,
      explanations
    }
  }
}
