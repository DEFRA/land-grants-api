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
 */

/**
 * @typedef {object} ActionPayment
 * @property {number} ratePerUnitGbp
 * @property {number} ratePerAgreementPerYearGbp
 */

/**
 * @typedef {object} ActionRule
 * @property {number} name
 * @property {ActionRuleConfig} config
 */

/**
 * @typedef {object} ActionRuleConfig
 * @property {string} layerName
 * @property {number} minimumIntersectionPercent
 * @property {number} tolerancePercent
 */
