/**
 * @typedef {object} PaymentSchedule
 * @property {string} agreementStartDate - The agreement start date
 * @property {string} agreementEndDate - The agreement end date
 * @property {Array<string>} schedule - The date schedule
 */

/**
 * @typedef {object} PaymentParcel
 * @property {string} sheetId - The sheet id of the parcel
 * @property {string} parcelId - The parcel id of the parcel
 * @property {Array<PaymentParcelAction>} actions - The actions
 */

/**
 * @typedef {object} PaymentParcelAction
 * @property {string} code - The code of the action
 * @property {number} quantity - The quantity applied for the action
 */

/**
 * @typedef {object} PaymentParcelItem
 * @property {string} code - The code of the action
 * @property {string} description - The description of the action
 * @property {string} unit
 * @property {string} sheetId
 * @property {string} parcelId
 * @property {number} quantity - The quantity applied for the action
 * @property {number} rateInPence - The rate paid for the action
 * @property {number} annualPaymentPence - The annual payment paid for the action
 */

/**
 * @typedef {object} PaymentAgreementItem
 * @property {string} code - The code of the action
 * @property {string} description - The description of the action
 * @property {number} annualPaymentPence - The annual payment paid for the action
 */

/**
 * @typedef {object} LineItem
 * @property {number} parcelItemId - ID of the linked PaymentParcelItem
 * @property {number} paymentPence - The payment for the parcel item
 */

/**
 * @typedef {object} ScheduledPayment
 * @property {Array<LineItem>} lineItems - Array of line items for the payment
 * @property {string} paymentDate - The payment date
 * @property {number} totalPaymentPence - The annual payment paid for the action
 */
