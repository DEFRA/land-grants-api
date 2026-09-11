/**
 * @import { RuleEngineApplication } from '~/src/features/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/features/actions/action.d.js'
 */

/**
 * @param {RuleEngineApplication} application - The application to execute the rule on
 * @param {ActionRule} rule - The rule to execute
 * @returns {RuleResultItem} - The result of the rule
 */
export const minimumLength = {
  execute: (application, rule) => {
    const {
      appliedForQuantity,
      landParcel: { availability, boundaryLength }
    } = application
    const { minimumLengthM } = rule.config ?? {}
    const name = rule.name

    if (!minimumLengthM) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: 'Missing config for minimum length',
        explanations: [
          {
            title: 'Minimum length',
            lines: ['No minimum allowable length is configured for this action']
          }
        ]
      }
    }

    const lines = [
      `The minimum allowable length is (${minimumLengthM} m), the available length was (${availability} m) and the applicant applied for (${appliedForQuantity} m)`
    ]

    if (boundaryLength) {
      lines.push(
        `The parcel boundary is (${boundaryLength.totalMeters} m) and (${boundaryLength.incompatibleMeters} m) is already committed to incompatible actions`
      )
    }

    const explanations = [{ title: 'Minimum length', lines }]

    if (availability < minimumLengthM) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: `The minimum allowable length for this action (${minimumLengthM} m) is more than the available length for this land parcel (${availability} m)`,
        explanations
      }
    }

    if (minimumLengthM > appliedForQuantity) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: `Enter a value that is no less than the minimum length for this action ${minimumLengthM} m`,
        explanations
      }
    }

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
      reason: `The applied for length meets the minimum allowable length for this action`,
      explanations
    }
  }
}
