import { rules } from './rules/index.js'

export const executeRule = (ruleName, application, ruleConfig) => {
  const rule = rules[ruleName]

  if (!rule) {
    throw new Error(`Unknown rule: ${ruleName}`)
  }

  return rule(application, ruleConfig)
}

export const executeRules = (application, rules) => {
  if (!rules?.length) {
    throw new Error('No rules provided to execute')
  }
  const results = rules.map((rule) => ({
    ruleName: rule.id,
    ...executeRule(rule.id, application, rule.config)
  }))

  return { results, passed: results.every((result) => result.passed === true) }
}
