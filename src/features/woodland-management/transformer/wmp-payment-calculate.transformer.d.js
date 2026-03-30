/**
 * @typedef {object} WmpAgreementTier
 * @property {number} number - The tier number (1-indexed)
 * @property {number} quantity - The eligible area in hectares
 * @property {number} rateInPence - The per-hectare rate in GBP
 * @property {number} flatRateInPence - The flat rate in GBP
 * @property {number} totalInPence - The calculated payment value for this tier in GBP
 */

/**
 * @typedef {object} WmpAgreementLevelItem
 * @property {string} code - The action code
 * @property {string} description - The action description
 * @property {string} version - The action semantic version
 * @property {string[]} parcelIds - The parcel IDs included in this item
 * @property {WmpAgreementTier[]} tiers - The payment tiers
 * @property {number} agreementTotalPence - The total agreement payment in GBP
 * @property {string} unit - The unit of measurement
 * @property {number} quantity - The eligible area in hectares
 */

/**
 * @typedef {object} WmpPaymentLineItem
 * @property {number} agreementLevelItemId - The agreement level item ID
 * @property {number} paymentPence - The payment amount in GBP
 */

/**
 * @typedef {object} WmpPayment
 * @property {number} totalPaymentPence - The total payment amount in GBP
 * @property {string} paymentDate - The payment date in YYYY-MM-DD format
 * @property {WmpPaymentLineItem[]} lineItems - The payment line items
 */

/**
 * @typedef {object} WmpPaymentCalculateResponse
 * @property {any[]} explanations - Explanations for the calculation (currently empty)
 * @property {string} agreementStartDate - The agreement start date in YYYY-MM-DD format
 * @property {string} agreementEndDate - The agreement end date in YYYY-MM-DD format
 * @property {'Single'} frequency - The payment frequency
 * @property {number} agreementTotalPence - The total agreement payment in GBP
 * @property {object} parcelItems - The parcel items
 * @property {{ [id: number]: WmpAgreementLevelItem }} agreementLevelItems - The agreement level items keyed by ID
 * @property {WmpPayment[]} payments - The payment schedule
 */
