/**
 * @import { RuleEngineApplication } from '~/src/features/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/features/actions/action.d.js'
 */

import { REQUIRED_RULE_DATA } from '../../services/requiredRuleData.js'

/**
 * @param {RuleEngineApplication} application - The application to execute the rule on
 * @param {ActionRule} rule - The rule to execute
 * @returns {RuleResultItem} - The result of the rule
 */
export const minimumLength = {
  requires: [
    // The applied-for quantity is not declared, so /parcels keeps this rule
    // and runs it before anything is applied for
    { type: REQUIRED_RULE_DATA.AVAILABLE_LENGTH }
  ],
  execute: (application, rule) => {
    const {
      appliedForQuantity,
      landParcel: { availability, boundaryLength }
    } = application
    const { minimumLengthM } = rule.config ?? {}
    const name = rule.name
    const hasAppliedFor = appliedForQuantity !== undefined

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
      hasAppliedFor
        ? `The minimum allowable length is (${minimumLengthM} m), the available length was (${availability} m) and the applicant applied for (${appliedForQuantity} m)`
        : `The minimum allowable length is (${minimumLengthM} m) and the available length was (${availability} m)`
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

    if (hasAppliedFor && appliedForQuantity < minimumLengthM) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: `The length must be at least ${minimumLengthM} m`,
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
