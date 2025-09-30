/**
 * @import { ExplanationSection } from '../available-area/explanations.d.js'
 */

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
 * @property {number} version - The action version
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
 * @property {number} version - The action version
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

/**
 * @typedef {object} PaymentCalculationResponse
 * @property {string} agreementStartDate - Agreement start date in ISO format (YYYY-MM-DD)
 * @property {string} agreementEndDate - Agreement end date in ISO format (YYYY-MM-DD)
 * @property {string} frequency - Payment frequency (e.g., "Quarterly", "Annual")
 * @property {number} agreementTotalPence - Total payment amount for entire agreement in pence
 * @property {number} annualTotalPence - Annual payment total in pence
 * @property {object} parcelItems - Parcel-level payment items keyed by ID
 * @property {object} agreementLevelItems - Agreement-level payment items keyed by ID
 * @property {Array<ScheduledPayment>} payments - Scheduled payment breakdown
 * @property {Array<ExplanationSection>} explanations - Explanations for the payment calculation
 */
