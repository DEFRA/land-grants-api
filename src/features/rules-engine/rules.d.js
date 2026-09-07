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
 * @property {object} cavets
 */

/**
 * @typedef {object} RulesResult
 * @property {boolean} passed
 * @property {RuleResultItem[]} results
 */

/**
 * @typedef {object} LandParcel
 * @property {number|null} availableAreaSqm
 * @property {number} [parcelSizeSqm] - Only present when a rule requires it (fetched on demand)
 * @property {number} availability
 * @property {Array} existingAgreements
 * @property {object} intersections
 */

/**
 * @typedef {object} RuleEngineApplication
 * @property {string} [parcelId]
 * @property {string} [sheetId]
 * @property {string} [actionCode]
 * @property {number|string} [oldWoodlandAreaSqm]
 * @property {number|string|null} [newWoodlandAreaSqm]
 * @property {number|string} [totalParcelAreaSqm]
 * @property {number} [totalAvailableArea]
 * @property {number|string} [appliedForQuantity]
 * @property {string} [actionCodeAppliedFor]
 * @property {LandParcel} [landParcel]
 */

/**
 * @typedef {object} RequirementDescriptor
 * @property {string} type - The requirement type, mapped to a provider in data-requirements/providers.js
 * @property {string} [layer] - For intersection requirements, the data layer name (e.g. 'moorland')
 */

/**
 * @typedef {object} RuleExecutor
 * @property {Function} execute
 * @property {RequirementDescriptor[]} [requires] - Data this rule needs fetched into the application before execution
 */
