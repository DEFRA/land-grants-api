/**
 * @typedef {object} LandAction
 * @property {string} sheetId
 * @property {string} parcelId
 * @property {number} sbi
 * @property {Action[]} actions
 */

/**
 * @typedef {object} Action
 * @property {string} code
 * @property {number} quantity
 */

/**
 * @typedef {object} PaymentCalculateRequestPayload
 * @property {Date} [startDate] - Optional start date for the payment calculation
 * @property {string} [sbi] - Optional Single Business Identifier
 * @property {LandAction[]} landActions - Array of land actions with sheet ID, parcel ID, and associated actions
 */
