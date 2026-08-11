/**
 * @import { Explanation } from '~/src/features/rules-engine/rules.d.js'
 * @import { RulesResult } from '~/src/features/rules-engine/rules.d.js'
 */

/**
 * @typedef {object} Action
 * @property {number} id
 * @property {number} version
 * @property {boolean} display
 * @property {boolean} enabled
 * @property {Date} startDate
 * @property {string} code
 * @property {string} description
 * @property {string} applicationUnitOfMeasurement
 * @property {number} durationYears
 * @property {ActionPayment} payment
 * @property {string[]} landCoverClassCodes
 * @property {ActionRule[]} rules
 * @property {Date} lastUpdated
 * @property {string} actionConfigVersion
 * @property {string} semanticVersion
 * @property {number} groupId
 * @property {string} groupName
 * @property {number} displayOrder
 * @property {object} paymentMethod
 * @property {string} [guidanceUrl]
 * @property {ActionAvailability} [availability]
 */

/**
 * @typedef {object} ActionAvailability
 * @property {'total'|'partial'} [type] - Governs how the user must enter a value relative to availableArea: 'total' requires the full amount, 'partial' allows any amount up to and including the total. Values are defined in src/features/common/constants/action_availability.js.
 */

/**
 * @typedef {object} ActionPayment
 * @property {number} ratePerUnitGbp
 * @property {number} ratePerAgreementPerYearGbp
 */

/**
 * @typedef {object} ActionRule
 * @property {string} name
 * @property {string} [type] - Optional override selecting which registered rule executor
 * to dispatch to (rules-engine/rules/index.js key is `${type ?? name}-${version}`). Lets a
 * generic, reusable executor (e.g. 'manual-check-required') be configured under any
 * per-action `name` (e.g. 'pond-check-required') without a new registry entry.
 * @property {string} description
 * @property {ActionRuleConfig} config
 * @property {string} version
 */

/**
 * @typedef {object} ActionRuleConfig
 * @property {string} layerName
 * @property {number} minimumIntersectionPercent
 * @property {number} tolerancePercent
 * @property {string} caveatDescription
 */

/**
 * @typedef {object} AvailableArea
 * @property {Explanation[]} explanations
 * @property {number} areaInHa
 */

/**
 * @typedef {object} ActionRuleResult
 * @property {RulesResult} ruleResult
 * @property {AvailableArea} availableArea
 */

/**
 * @typedef {object} ActionRequest
 * @property {string} actionCode - The action code
 * @property {number} areaSqm - The action area in sqm
 */

/**
 * @typedef {object} ActionCodeVersion
 * @property {string} code - The action code
 * @property {string} [version] - The semantic version (e.g. '3.1.0'). When omitted, the latest version is used.
 */

/**
 * @typedef {object} ActionEligibility
 * @property {number} id
 * @property {string} code
 * @property {string} description
 * @property {boolean} sssi_eligible
 * @property {boolean} hf_eligible
 * @property {string} ingest_id
 * @property {Date} last_updated
 */
