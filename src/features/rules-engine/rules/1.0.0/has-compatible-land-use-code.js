/**
 * @import { RuleEngineApplication, RuleResultItem } from '~/src/features/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/features/actions/action.d.js'
 */

/**
 * @param {RuleEngineApplication} application - The application to execute the rule on
 * @param {ActionRule} rule - The rule to execute
 * @returns {RuleResultItem} - The result of the rule
 */
export const hasCompatibleLandUseCode = {
  execute: (application, rule) => {
    const { landUseCode } = rule.config
    const {
      landParcel: { landUseCodes }
    } = application
    const name = `${rule.name}`

    const explanations = [
      {
        title: `Land use code check`,
        lines: [`Land use code ${landUseCode} is required`]
      }
    ]

    const hasLandUseCode = landUseCodes.some(
      (code) =>
        code.localeCompare(landUseCode, 'en', { sensitivity: 'base' }) === 0
    )

    if (hasLandUseCode) {
      return {
        name,
        passed: true,
        description: rule.description,
        reason: 'Parcel land use code matches the required land use code',
        explanations
      }
    }

    return {
      name,
      passed: false,
      description: rule.description,
      reason: 'Parcel does not have a compatible land use code',
      explanations
    }
  }
}
