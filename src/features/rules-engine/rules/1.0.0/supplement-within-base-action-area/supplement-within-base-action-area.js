import { listOf } from '~/src/features/common/helpers/list-of.js'
import { normalizeAppliedArea } from '~/src/features/common/helpers/measurement.js'
import { REQUIRED_RULE_DATA } from '~/src/features/rules-engine/services/requiredRuleData.js'

/**
 * @import { RuleEngineApplication, RuleResultItem } from '~/src/features/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/features/actions/action.d.js'
 */

// A supplement's area is no more than the area of its base actions applied for on the parcel.

/**
 * @param {RuleEngineApplication} application - The application to execute the rule on
 * @param {ActionRule} rule - The rule to execute
 * @returns {RuleResultItem} - The result of the rule
 */
export const supplementWithinBaseActionArea = {
  requires: [
    { type: REQUIRED_RULE_DATA.APPLIED_FOR_QUANTITY },
    { type: REQUIRED_RULE_DATA.SUPPLEMENT_BASE_ACTIONS }
  ],
  execute: (application, rule) => {
    const {
      actionCodeAppliedFor: code,
      appliedForQuantity,
      applicationUnitOfMeasurement,
      supplementBaseActions: { baseCodes, onParcel }
    } = /** @type {Required<RuleEngineApplication>} */ (application)
    const { name, description } = rule

    // A supplement with several of its base actions on the parcel can use them all
    const baseAreaSqm = onParcel.reduce(
      (total, base) => total + base.areaSqm,
      0
    )
    const baseCodesNamed =
      onParcel.length > 0
        ? listOf([...new Set(onParcel.map((base) => base.actionCode))], 'and')
        : listOf(baseCodes, 'or') || 'base action'

    const {
      unit,
      appliedAreaDisplay,
      availableAreaDisplay,
      appliedAreaSqm,
      availableAreaSqmDisplay
    } = normalizeAppliedArea(
      applicationUnitOfMeasurement,
      appliedForQuantity,
      baseAreaSqm
    )

    const applied = `${appliedAreaDisplay} ${unit}`
    const base = `${availableAreaDisplay} ${unit}`

    const explanations = [
      {
        title: 'Base action area',
        lines: [
          `The area of ${baseCodesNamed} is (${base}), and the applicant applied for (${applied}) of ${code}.`
        ]
      }
    ]

    if (appliedAreaSqm > availableAreaSqmDisplay) {
      return {
        name,
        passed: false,
        description,
        reason: `The area (${applied}) must not exceed the ${baseCodesNamed} area (${base})`,
        explanations
      }
    }

    return {
      name,
      passed: true,
      description,
      reason: `The area (${applied}) is within the ${baseCodesNamed} area (${base})`,
      explanations
    }
  }
}
