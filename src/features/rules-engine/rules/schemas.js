import Joi from 'joi'
import { ruleConfigs as ruleConfigsV1 } from './1.0.0/schemas.js'
import { ruleKeyFor } from './rule-key.js'

// Keyed the same way as ./index.js. Spread each new version folder in here.
export const ruleConfigs = { ...ruleConfigsV1 }

// Config is required unless the schema opts out with .optional() or .forbidden()
const configFor = (schema) =>
  schema.describe().flags?.presence ? schema : schema.required()

// The engine runs rules[ruleKeyFor(rule)], so this looks up ruleConfigs[ruleKeyFor(rule)]
const ruleConfig = Joi.when(
  // '..' is the parent of config, the whole rule, which adjust turns into its rule key
  Joi.ref('..', { adjust: ruleKeyFor }),
  {
    // One case per rule key; config is validated against the first that matches.
    // A key with no case leaves config unchecked, which is why isKnownRule exists
    switch: Object.entries(ruleConfigs).map(([key, schema]) => ({
      is: key,
      then: configFor(schema)
    }))
  }
)

const isKnownRule = (rule, helpers) =>
  ruleKeyFor(rule) in ruleConfigs
    ? rule
    : helpers.message(
        { custom: '"{{#ruleKey}}" is an unknown rule' },
        { ruleKey: ruleKeyFor(rule) }
      )

/**
 * Schema for one entry of an action's `rules` array, from the rules engine's
 * side only: the engine runs the rule keyed by `ruleKeyFor`, so that must be a
 * rule it has, and `config` must satisfy that rule. Which rules an action is
 * allowed to use is the action schema's job, not this package's.
 */
export const ruleSchema = Joi.object({
  description: Joi.string().required(),
  name: Joi.string().required(),
  type: Joi.string(),
  version: Joi.string(),
  config: ruleConfig
}).custom(isKnownRule)
