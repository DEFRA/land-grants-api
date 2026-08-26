/**
 * @typedef {object} WMPRequest
 * @property {string[]} parcelIds
 * @property {number|string|undefined} oldWoodlandAreaHa
 * @property {number} newWoodlandAreaHa
 */

/**
 * @typedef {object} WMPResponse
 * @property {Action | undefined} action
 * @property {RulesResult} ruleResult
 */

/**
 * Payload for POST /wmp/payments/calculate
 * @typedef {object} WMPPaymentCalculateRequest
 * @property {string[]} parcelIds
 * @property {number} oldWoodlandAreaHa
 * @property {number} newWoodlandAreaHa
 * @property {string|Date} [startDate]
 * @property {string} [version] - Exact action config semantic version to pin the rate to
 */

/**
 * Payload for POST /wmp/payments/calculate-by-total-area
 * @typedef {object} WMPPaymentCalculateTotalRequest
 * @property {number} totalAreaHa
 * @property {string} applicationId
 * @property {string} sbi
 * @property {string} [crn]
 * @property {string|Date} [startDate]
 * @property {string} [version] - Exact action config semantic version to pin the rate to
 */

/**
 * @import { Action } from '~/src/features/actions/action.d.js'
 * @import { RulesResult } from '~/src/features/rules-engine/rules.d.js'
 */
