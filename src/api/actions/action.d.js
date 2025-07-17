/**
 * @typedef {object} Action
 * @property {number} id
 * @property {number} version
 * @property {boolean} display
 * @property {boolean} enabled
 * @property {Date} start_date
 * @property {string} code
 * @property {string} description
 * @property {string} application_unit_of_measurement
 * @property {ActionPayment} payment
 * @property {string[]} land_cover_class_codes
 * @property {ActionRule[]} rules
 * @property {Date} last_updated
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
