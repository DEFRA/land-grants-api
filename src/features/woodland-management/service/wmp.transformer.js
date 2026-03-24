export const wmpResultTransformer = (
    action,
    ruleResult
) => {
    return {
        hasPassed: ruleResult.passed,
        code: action.code,
        actionConfigVersion: action?.semanticVersion,
        rules: ruleResult.results
    }
}
