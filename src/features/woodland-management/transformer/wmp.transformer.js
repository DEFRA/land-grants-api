/**
 *
 * @param {import('../../actions/action.d.js').Action | undefined} action
 * @param {import('~/src/features/rules-engine/rules.d.js').RulesResult} ruleResult
 * @returns {{hasPassed: boolean, code: string, actionConfigVersion: string, rules: import('~/src/features/rules-engine/rules.d.js').RuleResultItem[]}}
 */
export const wmpResultTransformer = (action, ruleResult) => {
  return {
    hasPassed: ruleResult.passed,
    code: action?.code ?? '',
    actionConfigVersion: action?.semanticVersion ?? '',
    rules: ruleResult.results
  }
}
