/**
 * Calculates the eligible woodland area, applying the young woodland cap.
 *
 * Young woodland (new woodland) can contribute at most `newWoodlandMaxPercent`% of
 * the total woodland area. Any excess is excluded from payment.
 *
 * @param {number} oldWoodlandAreaHa - Area of established woodland in hectares
 * @param {number} newWoodlandAreaHa - Area of young woodland (under 10 years) in hectares
 * @param {number} newWoodlandMaxPercent - Maximum percentage of total area that new woodland may contribute
 * @returns {number} The eligible area in hectares
 */
const calculateEligibleArea = (
  oldWoodlandAreaHa,
  newWoodlandAreaHa,
  newWoodlandMaxPercent
) => {
  const totalWoodlandAreaHa = oldWoodlandAreaHa + newWoodlandAreaHa
  const maxNewWoodland = (newWoodlandMaxPercent / 100) * totalWoodlandAreaHa
  const eligibleNewWoodland = Math.min(newWoodlandAreaHa, maxNewWoodland)
  return oldWoodlandAreaHa + eligibleNewWoodland
}

/**
 * Determines the payment amount based on the eligible area and configured tiers.
 * Each tier defines a flat rate and a per-hectare rate above the tier's lower limit.
 * The highest applicable tier (where eligible area exceeds the lower limit) is used.
 * @param {number} eligibleArea - The eligible area in hectares
 * @param {WmpPaymentTier[]} tiers - Payment tier configuration
 * @returns {number} The payment amount in GBP, rounded to the nearest pound
 */
const calculateTierPayment = (eligibleArea, tiers) => {
  const sortedTiers = [...tiers].sort(
    (a, b) => b['lower-limit-exclusive-ha'] - a['lower-limit-exclusive-ha']
  )

  const applicableTier = sortedTiers.find(
    (tier) => eligibleArea > tier['lower-limit-exclusive-ha']
  )

  if (!applicableTier) return 0

  const aboveLimit = Math.max(
    0,
    eligibleArea - applicableTier['lower-limit-exclusive-ha']
  )

  return Math.round(
    applicableTier['flat-rate-gbp'] +
      applicableTier['rate-per-unit-gbp'] * aboveLimit
  )
}

export const wmpCalculation = {
  /**
   * Executes the WMP payment calculation.
   * Applies the young woodland cap to determine the eligible area, then
   * selects the appropriate payment tier to calculate the total payment.
   * @param {WmpPaymentMethod} paymentMethod - The payment method configuration
   * @param {WmpCalculationInput} data - The application data
   * @returns {WmpCalculationResult} The eligible area and payment amount
   */
  execute: (paymentMethod, data) => {
    const { config } = paymentMethod
    const tiers = config.tiers
    const newWoodlandMaxPercent = config['new-woodland-max-percent']
    const { oldWoodlandAreaHa, newWoodlandAreaHa } = data.data

    const eligibleArea = calculateEligibleArea(
      oldWoodlandAreaHa,
      newWoodlandAreaHa,
      newWoodlandMaxPercent
    )

    const payment = calculateTierPayment(eligibleArea, tiers)

    return { eligibleArea, payment }
  }
}

/**
 * @import { WmpPaymentMethod, WmpPaymentTier, WmpCalculationInput, WmpCalculationResult } from './wmp-calculation.d.js'
 */
