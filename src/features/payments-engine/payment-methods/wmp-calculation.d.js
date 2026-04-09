/**
 * @typedef {object} WmpTier
 * @property {number} lowerLimitHa - Exclusive lower boundary in hectares; also used as the rate calculation base
 * @property {number | null} upperLimitHa - Exclusive upper boundary in hectares; null for the final open-ended tier
 * @property {number} flatRateGbp - Fixed base payment in GBP for this tier
 * @property {number} ratePerUnitGbp - Variable payment rate in GBP per hectare above lowerLimitHa
 */

/**
 * @typedef {object} WmpPaymentMethodConfig
 * @property {number} newWoodlandMaxPercent - Maximum percentage of total woodland area that young woodland may contribute
 * @property {WmpTier[]} tiers - Payment tiers ordered ascending by lowerLimitHa
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
 * @typedef {object} WmpCalculationResult
 * @property {number} eligibleArea - The eligible woodland area in hectares after applying the young woodland cap
 * @property {number} payment - The calculated payment amount in GBP
 * @property {number} activePaymentTier - The 1-based index of the selected payment tier (0 if no tier applies)
 * @property {number} quantityInActiveTier - The eligible area above the active tier's lower limit in hectares
 * @property {number} activeTierRatePence - The per-hectare rate of the active tier in GBP
 * @property {number} activeTierFlatRatePence - The flat rate of the active tier in GBP
 */
