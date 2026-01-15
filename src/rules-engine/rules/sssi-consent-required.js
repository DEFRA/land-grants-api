/**
 * @import { RuleEngineApplication, RuleResultItem } from '~/src/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/api/actions/action.d.js'
 */

/**
 * @param {RuleEngineApplication} application - The application to execute the rule on
 * @param {ActionRule} rule - The rule to execute
 * @returns {RuleResultItem} - The result of the rule
 */
export const sssiConsentRequired = {
  execute: (application, rule) => {
    const { layerName, caveatDescription } = rule.config
    const name = `${rule.name}-${layerName}`

    const explanations = [
      {
        title: `${layerName} check`,
        lines: []
      }
    ]

    const isConsentRequired = false

    return {
      name,
      passed: !isConsentRequired,
      reason: isConsentRequired
        ? caveatDescription
        : caveatDescription.replace('A', 'No'),
      description: rule.description,
      explanations
    }
  }
}
