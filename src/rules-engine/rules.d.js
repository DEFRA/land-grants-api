/**
 * @typedef {object} Explanation
 * @property {string} title
 * @property {string[]} lines
 */

/**
 * @typedef {object} RuleResultItem
 * @property {string} name
 * @property {string} description
 * @property {boolean} passed
 * @property {string} reason
 * @property {Explanation[]} explanations
 */

/**
 * @typedef {object} RulesResult
 * @property {boolean} passed
 * @property {RuleResultItem[]} results
 */

/**
 * @typedef {object} LandParcel
 * @property {number} area
 * @property {Array} existingAgreements
 * @property {object} intersections
 */

/**
 * @typedef {object} RuleEngineApplication
 * @property {number} areaAppliedFor
 * @property {string} actionCodeAppliedFor
 * @property {LandParcel} landParcel
 */

/**
 * @typedef {object} RuleExecutor
 * @property {Function} execute
 */
