/**
 * @import { RuleEngineApplication } from '~/src/features/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/features/actions/action.d.js'
 * @import { Sidedness } from '~/src/features/available-length/available-length.d.js'
 */

import { REQUIRED_RULE_DATA } from '~/src/features/rules-engine/services/requiredRuleData.js'
import {
  SINGLE_SIDE,
  billingFactorOf
} from '~/src/features/common/constants/sidedness.js'

/**
 * @param {number} minimumLengthM - The action's configured minimum length in metres
 * @returns {string} Shown to the applicant when they enter less than the minimum length
 */
export const belowMinimumLengthReason = (minimumLengthM) =>
  `The minimum allowable length for this action is ${minimumLengthM} m`

/**
 * @param {number} minimumLengthM - The action's configured minimum length of boundary in metres
 * @param {Sidedness} [sidedness] - The sidedness of the action applied for
 * @returns {number} The minimum in the billed metres the available length is given in
 */
const billedMinimumOf = (minimumLengthM, sidedness) =>
  minimumLengthM * billingFactorOf(sidedness)

/**
 * @param {number} minimumLengthM - The action's configured minimum length of boundary in metres
 * @param {Sidedness} [sidedness] - The sidedness of the action applied for
 * @returns {string} The minimum as reasons and explanations show it, across both sides as well for a single-side action
 */
const describeMinimum = (minimumLengthM, sidedness) =>
  sidedness === SINGLE_SIDE
    ? `(${minimumLengthM} m of boundary, ${billedMinimumOf(minimumLengthM, sidedness)} m across both sides)`
    : `(${minimumLengthM} m)`

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
      landParcel: { availability, boundaryLength, sidedness }
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

    const minimum = describeMinimum(minimumLengthM, sidedness)
    const lines = [
      hasAppliedFor
        ? `The minimum allowable length is ${minimum}, the available length was (${availability} m) and the applicant applied for (${appliedForQuantity} m)`
        : `The minimum allowable length is ${minimum} and the available length was (${availability} m)`
    ]

    if (boundaryLength) {
      lines.push(
        `The parcel boundary is (${boundaryLength.totalMeters} m) and (${boundaryLength.incompatibleMeters} m) is already committed to incompatible actions`
      )
    }

    const explanations = [{ title: 'Minimum length', lines }]

    const billedMinimumM = billedMinimumOf(minimumLengthM, sidedness)
    if (availability < billedMinimumM) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: `The minimum allowable length for this action ${minimum} is more than the available length for this land parcel (${availability} m)`,
        explanations
      }
    }

    if (hasAppliedFor && appliedForQuantity < minimumLengthM) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: belowMinimumLengthReason(minimumLengthM),
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
