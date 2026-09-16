import { HECTARES, SQM } from '~/src/features/common/constants/unit_type.js'
import {
  haToSqm,
  roundSqm,
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
      applicationUnitOfMeasurement,
      landParcel: { availableAreaSqm }
    } = application

    // Hectare actions apply for hectares and compare in sqm; sqm actions
    // (e.g. buildings) already apply for and compare in sqm directly.
    const isHectares = applicationUnitOfMeasurement === HECTARES
    const unit = isHectares ? HECTARES : (applicationUnitOfMeasurement ?? SQM)

    const availableAreaDisplay = isHectares
      ? sqmToHaRounded(availableAreaSqm)
      : availableAreaSqm
    const appliedForQuantityDisplay = isHectares
      ? Number.parseFloat(appliedForQuantity)
      : roundSqm(appliedForQuantity)
    const appliedForQuantitySqm = isHectares
      ? haToSqm(appliedForQuantityDisplay)
      : appliedForQuantityDisplay

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
