/**
 * @typedef {object} Explanation
 * @property {string} title
 * @property {string[]} lines
 */

/**
 * @typedef {object} RulesResult
 * @property {boolean} passed
 * @property {{name: string, passed: boolean, reason: string, explanations: Explanation[]}[]} results
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
