/**
 * @import { Explanation } from '~/src/rules-engine/rules.d.js'
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
 * @property {string} rule
 * @property {string} actionConfigVersion
 * @property {Explanation[]} explanations
 */
