/**
 * @import { Explanation } from '~/src/rules-engine/rules.d.js'
 * @import { RulesResult } from '~/src/rules-engine/rules.d.js'
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
 */

/**
 * @typedef {object} ActionPayment
 * @property {number} ratePerUnitGbp
 * @property {number} ratePerAgreementPerYearGbp
 */

/**
 * @typedef {object} ActionRule
 * @property {number} name
 * @property {string} description
 * @property {ActionRuleConfig} config
 */

/**
 * @typedef {object} ActionRuleConfig
 * @property {string} layerName
 * @property {number} minimumIntersectionPercent
 * @property {number} tolerancePercent
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
