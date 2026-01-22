/**
 * Executes the rules for the given application and action rules.
 * @param {{ [key: string]: RuleExecutor }} rules - The rules we can execute.
 * @param {RuleEngineApplication} application - The application to execute the rules on.
 * @param {ActionRule[]} actionRules - The action rules to execute.
 * @returns {RulesResult} - The results of the rules.
 */

export const executeRules = (rules, application, actionRules = []) => {
  const results = actionRules.map((rule) => {
    const version = rule.version ?? '1.0.0'
    const ruleKey = `${rule.name}-${version}`
    return rules[ruleKey]
      ? { ...rules[ruleKey].execute(application, rule) }
      : { name: rule.name, passed: false, message: 'Rule not found' }
  })

  return {
    results,
    passed:
      results.length > 0
        ? results.every((result) => result?.passed === true)
        : false
  }
}

/**
 * @import {ActionRule} from '../api/actions/action.d.js'
 * @import {RulesResult, RuleExecutor, RuleEngineApplication} from '../rules-engine/rules.d.js'
 */
