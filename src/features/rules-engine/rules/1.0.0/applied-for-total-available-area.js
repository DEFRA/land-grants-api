import {
  haToSqm,
  sqmToHaRounded
} from '~/src/features/common/helpers/measurement.js'

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
      landParcel: { availableAreaSqm }
    } = application

    const appliedForQuantityHa = Number.parseFloat(appliedForQuantity)
    const availableAreaHa = sqmToHaRounded(availableAreaSqm)
    const appliedForQuantitySqm = haToSqm(appliedForQuantityHa)

    const name = rule.name
    const explanations = [
      {
        title: 'Total valid land cover',
        lines: [
          `The available area was (${availableAreaHa} ha) the applicant applied for (${appliedForQuantity} ha)`
        ]
      }
    ]

    if (appliedForQuantitySqm !== availableAreaSqm) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: `There is not sufficient available area (${availableAreaHa} ha) for the applied figure (${appliedForQuantityHa} ha)`,
        explanations
      }
    }

    return {
      name,
      passed: true,
      description: rule.description,
      reason: `There is sufficient available area (${availableAreaHa} ha) for the applied figure (${appliedForQuantityHa} ha)`,
      explanations
    }
  }
}
