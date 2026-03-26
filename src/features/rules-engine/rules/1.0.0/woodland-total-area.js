// Rule 2: total area not exceed land parcels

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
    const { oldWoodlandAreaHa, newWoodlandAreaHa, totalParcelArea } =
      application

    const totalWoodlandArea =
      Number.parseFloat(oldWoodlandAreaHa) +
      Number.parseFloat(newWoodlandAreaHa || 0)

    const roundedTotalWoodlandArea = totalWoodlandArea.toFixed(4)
    const roundedTotalParcelArea = Number.parseFloat(totalParcelArea).toFixed(4)

    const name = rule.name
    const explanations = [
      {
        title: 'Woodland total area',
        lines: [
          `The total land parcel area is (${roundedTotalParcelArea} ha), the total woodland area (young + old) is (${roundedTotalWoodlandArea} ha)`
        ]
      }
    ]

    if (!totalWoodlandArea) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: 'No total woodland area has been provided',
        explanations
      }
    }

    if (totalWoodlandArea > Number.parseFloat(totalParcelArea)) {
      return {
        name,
        passed: false,
        description: rule.description,
        reason: `The total woodland area (${roundedTotalWoodlandArea} ha) exceeds the total land parcel area (${roundedTotalParcelArea} ha)`,
        explanations
      }
    }

    return {
      name,
      passed: true,
      description: rule.description,
      reason: `The total woodland area (${roundedTotalWoodlandArea} ha) does not exceed the total land parcel area (${roundedTotalParcelArea} ha)`,
      explanations
    }
  }
}
