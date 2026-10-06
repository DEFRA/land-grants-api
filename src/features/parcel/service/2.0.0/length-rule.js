import { executeRules } from '~/src/features/rules-engine/rulesEngine.js'
import { rules } from '~/src/features/rules-engine/rules/index.js'

// Not available-length: applying for exactly what is left, it always passes
const LENGTH_RULE_NAME = 'minimum-length'

/**
 * The action's length rule, if it is configured with one.
 * @param {Action} action - The action being applied for
 * @returns {ActionRule|undefined} The length rule
 */
export function findLengthRule(action) {
  return action.rules?.find((r) => (r.type ?? r.name) === LENGTH_RULE_NAME)
}

/**
 * Run a length rule as if applying for everything still claimable, so only the
 * rule's minimum can reject it.
 * @param {ActionRule} rule - The length rule to run
 * @param {string} actionCode - The action being applied for
 * @param {AvailableLength} availableLength - The boundary still claimable
 * @returns {LengthRuleResult} The rule's verdict
 */
export function executeLengthRule(rule, actionCode, availableLength) {
  const {
    availableLength: claimableLength,
    boundaryLengthMeters,
    incompatibleLengthMeters
  } = availableLength

  /** @type {RuleEngineApplication} */
  const application = {
    appliedForQuantity: claimableLength,
    actionCodeAppliedFor: actionCode,
    landParcel: {
      availability: claimableLength,
      availableAreaSqm: null,
      parcelSizeSqm: 0,
      existingAgreements: [],
      intersections: {},
      boundaryLength: {
        totalMeters: boundaryLengthMeters,
        incompatibleMeters: incompatibleLengthMeters
      }
    }
  }

  const { results, passed } = executeRules(rules, application, [rule])

  return {
    passed,
    reason: results[0]?.reason,
    minimumLengthMeters: rule.config?.minimumLengthM
  }
}

/**
 * @import {Action, ActionRule} from '~/src/features/actions/action.d.js'
 * @import {AvailableLength} from '~/src/features/available-length/available-length.d.js'
 * @import {LengthRuleResult} from '~/src/features/parcel/parcel.d.js'
 * @import {RuleEngineApplication} from '~/src/features/rules-engine/rules.d.js'
 */
