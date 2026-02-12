/**
 * @import { Explanation } from '~/src/features/rules-engine/rules.d.js'
 * @import { AvailableArea } from '~/src/features/actions/action.d.js'
 */

/**
 * @typedef {object} ParcelDetails
 * @property {string} sheetId
 * @property {string} parcelId
 */

/**
 * @typedef {object} ValidationResult
 * @property {string} code
 * @property {string} description
 * @property {string} sheetId
 * @property {string} parcelId
 * @property {boolean} passed
 * @property {AvailableArea} availableArea
 * @property {string} rule
 * @property {string} actionConfigVersion
 * @property {Explanation[]} explanations
 */
