/**
 * @import { RuleEngineApplication } from '~/src/features/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/features/actions/action.d.js'
 */

/**
 * @param {RuleEngineApplication} application - The application to execute the rule on
 * @param {ActionRule} rule - The rule to execute
 * @returns {RuleResultItem} - The result of the rule
 */
export const appliedForTotalOrPartialAvailableLength = {
  execute: (application, rule) => {
    const {
      appliedForQuantity,
      landParcel: { availability }
    } = application

    const { name } = rule

    const explanations = [
      {
        title: 'Total or partial available length',
        lines: [
          `The available boundary length was (${availability} m) the applicant applied for (${appliedForQuantity} m)`
        ]
      }
    ]

    if (availability < appliedForQuantity) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: `Enter a value that is no more than the available length for this land parcel ${availability} m`,
        explanations
      }
    }

    return {
      name,
      passed: true,
      description: rule.description,
      reason: `The applied for length (${appliedForQuantity} m) is no more than the available length (${availability} m)`,
      explanations
    }
  }
}
