// Rule 1: woodland-minimum-eligibility

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

const MINIMUM_WOODLAND_AREA_HA = 0.5

/**
 * @param {RuleEngineApplication} application - The application to execute the rule on
 * @param {ActionRule} rule - The rule to execute
 * @returns {RuleResultItem} - The result of the rule
 */
export const woodlandMinimumEligibility = {
  execute: (application, rule) => {
    const { woodlandAreaOver10Years } = application
    const name = rule.name

    const explanations = [
      {
        title: 'Woodland minimum eligibility',
        lines: [
          `The minimum required woodland area over 10 years old is (${MINIMUM_WOODLAND_AREA_HA} ha), the holding has (${Number.parseFloat(woodlandAreaOver10Years)} ha)`
        ]
      }
    ]

    if (!woodlandAreaOver10Years) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: 'No woodland area over 10 years old has been provided',
        explanations
      }
    }

    if (Number.parseFloat(woodlandAreaOver10Years) < MINIMUM_WOODLAND_AREA_HA) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: `The woodland area over 10 years old (${Number.parseFloat(woodlandAreaOver10Years)} ha) does not meet the minimum required area of (${MINIMUM_WOODLAND_AREA_HA} ha)`,
        explanations
      }
    }

    return {
      name,
      passed: true,
      description: rule.description,
      reason: `The woodland area over 10 years old (${Number.parseFloat(woodlandAreaOver10Years)} ha) meets the minimum required area of (${MINIMUM_WOODLAND_AREA_HA} ha)`,
      explanations
    }
  }
}
