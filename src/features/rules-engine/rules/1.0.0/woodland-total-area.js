// Rule 2: total area not exceed land parcels

import {
  haToSqm,
  sqmToHaRounded,
  roundTo4DecimalPlaces
} from '~/src/features/common/helpers/measurement.js'

// The total area of woodland (young + old) must not exceed the total area of land parcels entered into the agreement.

// Test Cases:

// Total are of woodland is the same as the total area of land parcels (validation pass)
// Total are of woodland is less than the total area of land parcels (validation pass)
// Total are of woodland is greater than the total area of land parcels (validation fail, return error message)
// User doesn’t enter a value (return error message)

/**
 * @import { RuleEngineApplication } from '~/src/features/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/features/actions/action.d.js'
 */

/**
 * @param {RuleEngineApplication} application - The application to execute the rule on
 * @param {ActionRule} rule - The rule to execute
 * @returns {RuleResultItem} - The result of the rule
 */
export const woodlandTotalArea = {
  execute: (application, rule) => {
    const { oldWoodlandAreaHa, newWoodlandAreaHa, totalParcelAreaSqm } =
      application

    const totalWoodlandAreaHa =
      Number.parseFloat(oldWoodlandAreaHa) +
      Number.parseFloat(newWoodlandAreaHa || 0)
    const totalWoodlandAreaSqm = Math.round(haToSqm(totalWoodlandAreaHa))
    const roundedTotalParcelAreaHa = sqmToHaRounded(
      Number.parseFloat(totalParcelAreaSqm)
    )
    const roundedTotalWoodlandAreaHa =
      roundTo4DecimalPlaces(totalWoodlandAreaHa)

    const name = rule.name
    const explanations = [
      {
        title: 'Woodland total area',
        lines: [
          `The total land parcel area is (${roundedTotalParcelAreaHa} ha), the total woodland area (young + old) is (${roundedTotalWoodlandAreaHa} ha)`
        ]
      }
    ]

    if (totalWoodlandAreaSqm > Number.parseFloat(totalParcelAreaSqm)) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: `The total woodland area (${roundedTotalWoodlandAreaHa} ha) exceeds the total land parcel area (${roundedTotalParcelAreaHa} ha)`,
        explanations
      }
    }

    return {
      name,
      passed: true,
      description: rule.description,
      reason: `The total woodland area (${roundedTotalWoodlandAreaHa} ha) does not exceed the total land parcel area (${roundedTotalParcelAreaHa} ha)`,
      explanations
    }
  }
}
