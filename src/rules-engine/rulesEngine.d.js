/**
 * @typedef {'landParcel' | 'landCover' | 'sssi' | 'monument' | 'moorland' | 'lfa' } LayerId
 */

/**
 * @typedef {Partial<Record<LayerId, number>>} Intersections
 */

/**
 * @type {Intersections}
 */
export const blankIntersections = {
  sssi: 0,
  monument: 0,
  moorland: 0,
  lfa: 0
}

/**
 * @typedef LandParcel
 * @property {number} area
 * @property {object[]} existingAgreements
 * @property {Intersections} intersections
 */

/**
 * @typedef Application
 * @property {number} areaAppliedFor
 * @property {string} actionCodeAppliedFor
 * @property {LandParcel} landParcel
 */

/**
 * @typedef RuleResponse
 * @property {boolean} passed
 */

/**
 * @typedef {object} RuleCheckResult
 * @property {boolean} passed
 * @property {string} message
 */

/**
 * @typedef {object} RuleCheckResults
 * @property {boolean} passed
 * @property {string} message
 * @property {RuleCheckResult[]} allResults
 */

/**
 * @typedef {Record<string, unknown>} RuleConfig
 */

/**
 * @typedef {Function} RuleCheck
 * @param {Application} application
 * @param {RuleConfig} ruleConfig
 * @returns {RuleCheckResult}
 */

/**
 * @typedef {object} Rule
 * @property {RuleCheck} check
 * @property {LayerId[]} requiredDataLayers
 */
