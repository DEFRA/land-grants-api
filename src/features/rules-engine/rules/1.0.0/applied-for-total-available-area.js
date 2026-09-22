import { normalizeAppliedArea } from '~/src/features/common/helpers/measurement.js'

/**
 * @import { RuleEngineApplication } from '~/src/features/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/features/actions/action.d.js'
 */

/**
 * @param {RuleEngineApplication} application - The application to execute the rule on
 * @param {ActionRule} rule - The rule to execute
 * @returns {RuleResultItem} - The result of the rule
 */
export const appliedForTotalAvailableArea = {
  execute: (application, rule) => {
    const {
      appliedForQuantity,
      applicationUnitOfMeasurement,
      landParcel: { availableAreaSqm }
    } = application

    const {
      unit,
      appliedAreaDisplay: appliedForQuantityDisplay,
      availableAreaDisplay,
      appliedAreaSqm: appliedForQuantitySqm
    } = normalizeAppliedArea(
      applicationUnitOfMeasurement,
      appliedForQuantity,
      availableAreaSqm
    )

    const name = rule.name
    const explanations = [
      {
        title: 'Total valid land cover',
        lines: [
          `The available area was (${availableAreaDisplay} ${unit}) the applicant applied for (${appliedForQuantityDisplay} ${unit})`
        ]
      }
    ]

    if (appliedForQuantitySqm !== availableAreaSqm) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: `There is not sufficient available area (${availableAreaDisplay} ${unit}) for the applied figure (${appliedForQuantityDisplay} ${unit})`,
        explanations
      }
    }

    return {
      name,
      passed: true,
      description: rule.description,
      reason: `There is sufficient available area (${availableAreaDisplay} ${unit}) for the applied figure (${appliedForQuantityDisplay} ${unit})`,
      explanations
    }
  }
}
