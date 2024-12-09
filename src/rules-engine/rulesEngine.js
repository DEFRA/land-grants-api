import { rules } from './rules/index.js'

/**
 *
 * @param {string} ruleName
 * @param {Application} application
 * @param {RuleConfig} ruleConfig
 * @returns {RuleCheckResult}
 */
export const executeRule = (ruleName, application, ruleConfig) => {
  const rule = rules[ruleName]

  if (!rule) {
    throw new Error(`Unknown rule: ${ruleName}`)
  }

  return rule(application, ruleConfig)
}

/**
 * @param {Application} application
 * @param {{id: string, config: RuleConfig}[]} rules
 * @returns {RuleCheckResults}
 */
export const executeRules = (application, rules) => {
  if (!rules?.length) {
    throw new Error('No rules provided to execute')
  }
  const results = rules.map((rule) => ({
    ruleName: rule.id,
    ...executeRule(rule.id, application, rule.config)
  }))

  return {
    results,
    passed: results.every((result) => result.passed === true),
    message: results.map((result) => result.message).join('\n')
  }
}

/**
 * @import { Application, RuleConfig, RuleCheckResult, RuleCheckResults } from '../types.js'
 */
