import { listOf } from '~/src/features/common/helpers/list-of.js'
import { REQUIRED_RULE_DATA } from '~/src/features/rules-engine/services/requiredRuleData.js'

/**
 * @import { RuleEngineApplication, RuleResultItem } from '~/src/features/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/features/actions/action.d.js'
 */

// A supplement is applied for on the same parcel as one of its base actions, in the same application.

/**
 * @param {RuleEngineApplication} application - The application to execute the rule on
 * @param {ActionRule} rule - The rule to execute
 * @returns {RuleResultItem} - The result of the rule
 */
export const supplementHasBaseAction = {
  requires: [
    // It depends on what is applied for on the parcel, so /parcels can't run it
    { type: REQUIRED_RULE_DATA.APPLIED_FOR_QUANTITY },
    { type: REQUIRED_RULE_DATA.SUPPLEMENT_BASE_ACTIONS }
  ],
  execute: (application, rule) => {
    const {
      actionCodeAppliedFor: code,
      supplementBaseActions: { baseCodes, onParcel }
    } = /** @type {Required<RuleEngineApplication>} */ (application)
    const { name, description } = rule

    if (baseCodes.length === 0) {
      return {
        name,
        passed: false,
        description,
        reason: `${code} is not a supplement of any action`,
        explanations: [
          {
            title: 'Base action',
            lines: [`${code} has no base action in the compatibility matrix.`]
          }
        ]
      }
    }

    if (onParcel.length === 0) {
      return {
        name,
        passed: false,
        description,
        reason: `${code} requires the base action ${listOf(baseCodes, 'or')} on the same land parcel`,
        explanations: [
          {
            title: 'Base action',
            lines: [
              baseCodes.length === 1
                ? `${code} is a supplement of ${baseCodes[0]}, which is not applied for on this land parcel in this application.`
                : `${code} is a supplement of ${listOf(baseCodes, 'or')}, none of which is applied for on this land parcel in this application.`
            ]
          }
        ]
      }
    }

    const baseCodesOnParcel = listOf(
      [...new Set(onParcel.map((base) => base.actionCode))],
      'and'
    )

    return {
      name,
      passed: true,
      description,
      reason: `${code} is applied for with its base action ${baseCodesOnParcel}`,
      explanations: [
        {
          title: 'Base action',
          lines: [
            `${code} is a supplement of ${baseCodesOnParcel}, applied for on this land parcel.`
          ]
        }
      ]
    }
  }
}
