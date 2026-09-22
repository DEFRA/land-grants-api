import { normalizeAppliedArea } from '~/src/features/common/helpers/measurement.js'

/**
 * @import { RuleEngineApplication } from '~/src/features/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/features/actions/action.d.js'
 */

// This rule allows applying for a partial or total area up to available area.

/**
 * @param {RuleEngineApplication} application - The application to execute the rule on
 * @param {ActionRule} rule - The rule to execute
 * @returns {RuleResultItem} - The result of the rule
 */
export const appliedForTotalOrPartialAvailableArea = {
  execute: (application, rule) => {
    const {
      appliedForQuantity,
      applicationUnitOfMeasurement,
      landParcel: { availableAreaSqm }
    } = application
    const name = rule.name

    const {
      unit,
      appliedAreaDisplay: parsedAppliedArea,
      availableAreaDisplay: parsedAvailableArea,
      appliedAreaSqm,
      availableAreaSqmDisplay: maximumAllowedAreaSqm
    } = normalizeAppliedArea(
      applicationUnitOfMeasurement,
      appliedForQuantity,
      availableAreaSqm
    )

    const explanations = [
      {
        title: 'Total or partial available area',
        lines: [
          `The available area is (${parsedAvailableArea} ${unit}), and the applicant applied for (${parsedAppliedArea} ${unit}).`
        ]
      }
    ]

    if (appliedAreaSqm <= 0 || appliedAreaSqm > maximumAllowedAreaSqm) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: `The amount of land must be the same as or less than the available area`,
        explanations
      }
    }

    return {
      name,
      passed: true,
      description: rule.description,
      reason: `The applied figure (${parsedAppliedArea} ${unit}) is within the allowed range (greater than 0 ${unit} and up to ${parsedAvailableArea} ${unit})`,
      explanations
    }
  }
}
