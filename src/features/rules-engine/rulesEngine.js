/**
 * @import {ActionRule} from '../features/actions/action.d.js'
 * @import {RulesResult, RuleExecutor, RuleEngineApplication} from '../rules-engine/rules.d.js'
 * @import {Action} from '../features/actions/action.d.js'
 */

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
 * Executes a single rule for the given enabled actions and application.
 * @param {Action[]} enabledActions - The enabled actions to execute the rule on.
 * @param {RuleEngineApplication} application - The application to execute the rule on.
 * @param {string} ruleName - The name of the rule to execute.
 * @param {RuleExecutor} ruleToExecute - The rule to execute.
 * @returns {object} - The result of the rule mapped by action code.
 */
export const executeSingleRuleForEnabledActions = (
  enabledActions,
  application,
  ruleName,
  ruleToExecute
) => {
  return Object.fromEntries(
    enabledActions
      .filter((action) => action.enabled && action.display)
      .map((action) => {
        const matchingRule = action.rules?.find(
          (rule) => String(rule.name) === ruleName
        )
        const result = matchingRule
          ? ruleToExecute.execute(application, matchingRule)
          : false

        return [action.code, result]
      })
  )
}
