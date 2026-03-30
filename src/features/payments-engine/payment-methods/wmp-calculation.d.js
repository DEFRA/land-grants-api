/**
 * @typedef {object} WmpPaymentTier
 * @property {number} flatRateGbp - The flat rate payment in GBP
 * @property {number} ratePerUnitGbp - The per-hectare rate above the tier's lower limit
 * @property {number} lowerLimitExclusiveHa - The exclusive lower limit in hectares that triggers this tier
 */

/**
 * @typedef {object} WmpPaymentMethodConfig
 * @property {WmpPaymentTier[]} tiers - The payment tiers, ordered by ascending lower limit
 * @property {number} newWoodlandMaxPercent - Maximum percentage of total woodland area that young woodland may contribute
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
 * @property {string | Date | undefined} startDate - The agreement start date. May be a Date object (produced by Joi date() coercion), an ISO string, or undefined to default to the 1st of next month
 */

/**
 * @typedef {object} WmpCalculationInput
 * @property {WmpCalculationData} data - The application data
 */

/**
 * @typedef {object} WmpTierValue
 * @property {WmpPaymentTier} tier - The tier configuration
 * @property {number} value - The calculated payment value for this tier in GBP, or 0 if the eligible area does not exceed the tier's lower limit
 */

/**
 * @typedef {object} WmpCalculationResult
 * @property {number} eligibleArea - The eligible woodland area in hectares after applying the young woodland cap
 * @property {number} payment - The calculated payment amount in GBP
 * @property {WmpTierValue[]} tierValues - The calculated payment value for each tier
 */
