/**
 * @import {ActionRule} from '~/src/features/actions/action.d.js'
 * @import {RulesResult, RuleExecutor, RuleEngineApplication} from '~/src/features/rules-engine/rules.d.js'
 * @import {Action} from '~/src/features/actions/action.d.js'
 */

// `type` lets a config-defined rule name (e.g. a per-action caveat identity like
// 'pond-check-required') be dispatched to a shared, generic executor (e.g.
// 'manual-check-required') without needing its own registry entry. Falls back to
// `name` for every existing rule, which has no `type` - dispatch is unchanged for them.
const ruleKeyFor = (rule) =>
  `${rule.type ?? rule.name}-${rule.version ?? '1.0.0'}`

/**
 * Executes the rules for the given application and action rules.
 * @param {{ [key: string]: RuleExecutor }} rules - The rules we can execute.
 * @param {RuleEngineApplication} application - The application to execute the rules on.
 * @param {ActionRule[]} actionRules - The action rules to execute.
 * @returns {RulesResult} - The results of the rules.
 */

export const executeRules = (rules, application, actionRules = []) => {
  const results = actionRules.map((rule) => {
    const ruleKey = ruleKeyFor(rule)
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
 * @param {{ [key: string]: RuleExecutor }} rules - The rules we can execute.
 * @param {Action[]} enabledActions - The enabled actions to execute the rule on.
 * @param {RuleEngineApplication} application - The application to execute the rule on.
 * @param {string} ruleName - The name of the rule to execute.
 * @returns {object} - The result of the rule mapped by action code.
 */
export const executeSingleRuleForEnabledActions = (
  rules,
  enabledActions,
  application,
  ruleName
) => {
  return Object.fromEntries(
    enabledActions
      .filter((action) => action.enabled && action.display)
      .map((action) => {
        const matchingRule = action.rules?.find(
          (rule) => String(rule.name) === ruleName
        )
        // Resolved per action, as executeRules does, so two actions naming the
        // same rule can dispatch to different executors via `type`
        const executor = matchingRule && rules[ruleKeyFor(matchingRule)]
        const result = executor
          ? executor.execute(application, matchingRule)
          : false

        return [action.code, result]
      })
  )
}
