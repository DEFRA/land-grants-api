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

// This rule allows applying for a partial or total area up to available area.

/**
 * Normalize the applied-for and available areas into the unit the rule
 * should display and compare in, given the action's own configured unit.
 * Hectare actions apply for hectares and compare in sqm; sqm actions (e.g.
 * buildings) already apply for and compare in sqm directly.
 * @param {string|undefined} applicationUnitOfMeasurement - The action's configured unit
 * @param {number|string} appliedForQuantity - The quantity applied for, in the action's unit
 * @param {number} availableAreaSqm - The available area, in sqm
 * @returns {{unit: string, parsedAppliedArea: number, parsedAvailableArea: number, appliedAreaSqm: number, maximumAllowedAreaSqm: number}}
 */
function normalizeAreaFigures(
  applicationUnitOfMeasurement,
  appliedForQuantity,
  availableAreaSqm
) {
  if (applicationUnitOfMeasurement === HECTARES) {
    const appliedAreaHa = Number.parseFloat(String(appliedForQuantity)) || 0
    const availableAreaHa = sqmToHaRounded(availableAreaSqm) || 0

    return {
      unit: HECTARES,
      parsedAppliedArea: appliedAreaHa,
      parsedAvailableArea: availableAreaHa,
      appliedAreaSqm: haToSqm(appliedAreaHa),
      maximumAllowedAreaSqm: haToSqm(availableAreaHa)
    }
  }

  const appliedAreaSqm = roundSqm(appliedForQuantity)
  const availableAreaSqmOrZero = availableAreaSqm || 0

  return {
    unit: applicationUnitOfMeasurement ?? SQM,
    parsedAppliedArea: appliedAreaSqm,
    parsedAvailableArea: availableAreaSqmOrZero,
    appliedAreaSqm,
    maximumAllowedAreaSqm: availableAreaSqmOrZero
  }
}

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
      parsedAppliedArea,
      parsedAvailableArea,
      appliedAreaSqm,
      maximumAllowedAreaSqm
    } = normalizeAreaFigures(
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
