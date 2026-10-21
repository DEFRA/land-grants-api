const DEFAULT_RULE_VERSION = '1.0.0'

// `type` lets a config-defined rule name (e.g. a per-action caveat identity like
// 'pond-check-required') be dispatched to a shared, generic executor (e.g.
// 'manual-check-required') without needing its own registry entry. Falls back to
// `name` for every existing rule, which has no `type` - dispatch is unchanged for them.
/**
 * @param {{ name: string, type?: string, version?: string }} rule
 * @returns {string}
 */
export const ruleKeyFor = (rule) =>
  `${rule.type ?? rule.name}-${rule.version ?? DEFAULT_RULE_VERSION}`
