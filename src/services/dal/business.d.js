/**
 * @typedef {object} AgreementAction
 * @property {string} optionCode - The action code
 * @property {string} sheetName - Sheet name for this action
 * @property {string} parcelName - Parcel ID for this action
 * @property {number} [actionArea] - Area for this action, in hectares, if area-based
 * @property {number} [actionMTL] - Length for this action, in metres, if length-based
 * @property {number} [actionUnits] - Count for this action, if count-based
 * @property {string} startDate - Start date for this action, ISO 8601
 * @property {string} endDate - Start date for this action, ISO 8601
 */

/**
 * @typedef {object} Agreement
 * @property {string} status - The status of this agreement, e.g. "SIGNED", "DRAFT", "ADMIN CHECK"
 * @property {AgreementAction[]} paymentSchedules - Actions under this agreement
 */

/**
 * @typedef {object} Business
 * @property {Agreement[]} agreements - Agreements for this business
 */
