/**
 * JSDoc shapes for JSON loaded from the config-broker S3 bucket and stored on
 * the Hapi server as `server.app.configBrokerCache`.
 * @see scripts/infra/floci-config/actions/PA3/pa3-1.0.0.json — example action config
 */

/**
 * @typedef {object} ConfigBrokerActionRule
 * @property {string} name
 * @property {string} [description]
 * @property {Record<string, unknown>} [config] - Rule-specific parameters (varies by rule)
 */

/**
 * @typedef {object} ConfigBrokerPaymentMethodTier
 * @property {number} flatRateGbp
 * @property {number} lowerLimitHa
 * @property {number|null} upperLimitHa
 * @property {number} ratePerUnitGbp
 */

/**
 * @typedef {object} ConfigBrokerPaymentMethodConfigWmp
 * @property {ConfigBrokerPaymentMethodTier[]} tiers
 * @property {number} [newWoodlandMaxPercent]
 */

/**
 * @typedef {object} ConfigBrokerPaymentMethod
 * @property {string} name
 * @property {string} version
 * @property {ConfigBrokerPaymentMethodConfigWmp|Record<string, unknown>} config - Varies by `name` (e.g. wmp-calculation)
 */

/**
 * Action (or similar) config document as published by config-broker.
 * Fields beyond the PA3 sample may exist on other codes/versions.
 * @typedef {object} ConfigBrokerAction
 * @property {string} code
 * @property {string} description
 * @property {boolean} enabled
 * @property {boolean} display
 * @property {boolean} sssi_eligible
 * @property {boolean} hf_eligible
 * @property {string|null} ingest_id
 * @property {unknown|null} payment
 * @property {ConfigBrokerActionRule[]} rules
 * @property {string} applicationUnitOfMeasurement
 * @property {number} durationYears
 * @property {string[]} landCoverClassCodes
 * @property {string} startDate
 * @property {string} lastUpdated
 * @property {number} version
 * @property {number} majorVersion
 * @property {number} minorVersion
 * @property {number} patchVersion
 * @property {string} semanticVersion
 * @property {number|null} groupId
 * @property {string|null} groupName
 * @property {number} displayOrder
 * @property {ConfigBrokerPaymentMethod} paymentMethod
 */

/**
 * One parsed config-broker object, or `null` when the object body was empty,
 * whitespace-only, or not valid JSON (see `parseJsonBodyFromStream`).
 * @typedef {ConfigBrokerAction|null} ConfigBrokerCacheEntry
 */

/**
 * Ordered list of parsed config-broker files (list order follows S3 listing).
 * @typedef {ConfigBrokerCacheEntry[]} ConfigBrokerCache
 */
