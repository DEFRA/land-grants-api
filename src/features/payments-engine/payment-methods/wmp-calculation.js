/**
 * Calculates the eligible woodland area, applying the young woodland cap.
 * Young woodland (new woodland) can contribute at most `newWoodlandMaxPercent`% of
 * the total woodland area. Any excess is excluded from payment.
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
 * Also returns the calculated value for every tier, with 0 for tiers that do not apply.
 * @param {number} eligibleArea - The eligible area in hectares
 * @param {WmpPaymentTier[]} tiers - Payment tier configuration
 * @returns {{ payment: number, tierValues: WmpTierValue[] }} The payment amount in GBP and per-tier values
 */
const calculateTierPayment = (eligibleArea, tiers) => {
  const tierValues = tiers.map((tier) => {
    if (eligibleArea <= tier.lowerLimitExclusiveHa) {
      return { tier, value: 0 }
    }
    const aboveLimit = eligibleArea - tier.lowerLimitExclusiveHa
    return {
      tier,
      value: Math.round(tier.flatRateGbp + tier.ratePerUnitGbp * aboveLimit)
    }
  })

  const sortedTiers = [...tiers].sort(
    (a, b) => b.lowerLimitExclusiveHa - a.lowerLimitExclusiveHa
  )

  const applicableTier = sortedTiers.find(
    (tier) => eligibleArea > tier.lowerLimitExclusiveHa
  )

  if (!applicableTier) return { payment: 0, tierValues }

  const aboveLimit = Math.max(
    0,
    eligibleArea - applicableTier.lowerLimitExclusiveHa
  )

  const payment = Math.round(
    applicableTier.flatRateGbp + applicableTier.ratePerUnitGbp * aboveLimit
  )

  return { payment, tierValues }
}

export const wmpCalculation = {
  /**
   * Executes the WMP payment calculation.
   * Applies the young woodland cap to determine the eligible area, then
   * selects the appropriate payment tier to calculate the total payment.
   * @param {WmpPaymentMethod} paymentMethod - The payment method configuration
   * @param {WmpCalculationInput} data - The application data
   * @returns {WmpCalculationResult} The eligible area, payment amount, and per-tier values
   */
  execute: (paymentMethod, data) => {
    const { config } = paymentMethod
    const tiers = config.tiers
    const newWoodlandMaxPercent = config.newWoodlandMaxPercent
    const { oldWoodlandAreaHa, newWoodlandAreaHa } = data.data

    const eligibleArea = calculateEligibleArea(
      oldWoodlandAreaHa,
      newWoodlandAreaHa,
      newWoodlandMaxPercent
    )

    const { payment, tierValues } = calculateTierPayment(eligibleArea, tiers)

    return { eligibleArea, payment, tierValues }
  }
}

/**
 * @import { WmpPaymentMethod, WmpPaymentTier, WmpCalculationInput, WmpCalculationResult, WmpTierValue } from './wmp-calculation.d.js'
 */
