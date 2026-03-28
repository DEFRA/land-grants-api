/**
 * @typedef {object} WmpPaymentTier
 * @property {number} flat-rate-gbp - The flat rate payment in GBP
 * @property {number} rate-per-unit-gbp - The per-hectare rate above the tier's lower limit
 * @property {number} lower-limit-exclusive-ha - The exclusive lower limit in hectares that triggers this tier
 */

/**
 * @typedef {object} WmpPaymentMethodConfig
 * @property {WmpPaymentTier[]} tiers - The payment tiers, ordered by ascending lower limit
 * @property {number} new-woodland-max-percent - Maximum percentage of total woodland area that young woodland may contribute
 */

/**
 * @typedef {object} WmpPaymentMethod
 * @property {string} name - The payment method name
 * @property {WmpPaymentMethodConfig} config - The payment method configuration
 */

/**
 * @typedef {object} WmpCalculationData
 * @property {number} totalParcelArea - Total parcel area in hectares
 * @property {number} oldWoodlandAreaHa - Area of established woodland in hectares
 * @property {number} newWoodlandAreaHa - Area of young woodland (under 10 years) in hectares
 * @property {string} startDate - The agreement start date
 */

/**
 * @typedef {object} WmpCalculationInput
 * @property {WmpCalculationData} data - The application data
 */

/**
 * @typedef {object} WmpCalculationResult
 * @property {number} eligibleArea - The eligible woodland area in hectares after applying the young woodland cap
 * @property {number} payment - The calculated payment amount in GBP
 */
