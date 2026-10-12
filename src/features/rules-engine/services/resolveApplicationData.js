import { rules } from '~/src/features/rules-engine/rules/index.js'
import { requirementProviders } from './dataProviders.js'

/**
 *
 * @param {ActionRule} rule
 * @returns string
 */
export const ruleKeyFor = (rule) =>
  `${rule.type ?? rule.name}-${rule.version ?? '1.0.0'}`

/**
 * Drops rules whose executor needs a data type the caller can't supply,
 * e.g. /parcels has no applied-for quantity.
 * @param {ActionRule[]} actionRules
 * @param {string} excludedType - A DATA_TYPES value
 * @returns {ActionRule[]}
 */
export const excludeRulesRequiring = (actionRules, excludedType) =>
  (actionRules ?? []).filter(
    (rule) =>
      !(rules[ruleKeyFor(rule)]?.requires ?? []).some(
        (req) => req.type === excludedType
      )
  )

/**
 * Collects the data requirements declared by an action's rules, dedupes them, fetches
 * only what is needed (in parallel), and folds the results into the application. The
 * rules engine itself stays pure - it receives the fully-resolved plain object.
 * @param {ActionRule[] | null} actionRules - The rules configured for the action
 * @param {RuleEngineApplication} baseApplication - Application data known without fetching (available area/length, agreements)
 * @param {RequirementContext} ctx - Identifiers and handles the providers fetch with
 * @returns {Promise<RuleEngineApplication>} The application with fetched data applied
 */
export const resolveApplicationData = async (
  actionRules,
  baseApplication,
  ctx
) => {
  const requirements = (actionRules ?? []).flatMap((rule) => {
    const rqrs = rules[ruleKeyFor(rule)]?.requires ?? []
    // if its an intersection type or boundary intersection,
    // we need to read the layerName from the rule.config
    if (rule.config?.layerName) {
      return rqrs.map((req) => ({ ...req, layer: rule.config.layerName }))
    }
    return rqrs
  })

  // Dedupe by provider key so the same data is only fetched once even if several
  // rules ask for it (e.g. two rules both needing the sssi intersection).
  const requirementsByKey = new Map()
  for (const req of requirements) {
    const provider = requirementProviders[req.type]
    if (!provider) {
      ctx.logger?.warn?.(`No provider for requirement type '${req.type}'`)
      continue
    }
    const key = provider.dedupeKey(req)
    if (!requirementsByKey.has(key)) {
      requirementsByKey.set(key, { req, provider })
    }
  }

  const entries = [...requirementsByKey.values()]
  const values = await Promise.all(
    entries.map(({ req, provider }) => provider.fetch(req, ctx))
  )

  const application = /** @type {RuleEngineApplication} */ ({
    ...baseApplication,
    landParcel: {
      ...baseApplication.landParcel,
      intersections: { ...(baseApplication.landParcel?.intersections ?? {}) }
    }
  })

  entries.forEach(({ req, provider }, index) => {
    provider.apply(application, req, values[index])
  })

  return application
}

/**
 * @import { ActionRule } from '~/src/features/actions/action.d.js'
 * @import { RuleEngineApplication } from '~/src/features/rules-engine/rules.d.js'
 * @import { RequirementContext } from '~/src/features/rules-engine/data-requirements.d.js'
 */
