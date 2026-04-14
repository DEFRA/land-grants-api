import {
  roundTo2DecimalPlaces,
  roundTo4DecimalPlaces
} from '../../common/helpers/measurement.js'

/**
 * Calculates the eligible woodland area, applying the young woodland cap.
 * Young woodland (new woodland) can contribute at most `newWoodlandMaxPercent`% of
 * the total woodland area. Any excess is excluded from payment.
 * @param {number} oldWoodlandAreaHa - Area of established woodland in hectares
 * @param {number} newWoodlandAreaHa - Area of young woodland (under 10 years) in hectares
 * @param {number} newWoodlandMaxPercent - Maximum percentage of total area that new woodland may contribute
 * @returns {number} The eligible area in hectares
 */
export const calculateEligibleArea = (
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
 * Selects the applicable payment tier and calculates the payment for the given eligible area.
 * Returns payment of 0 and tierIndex of -1 if the area is below the first tier's lower limit (exclusive).
 * The first tier where `area < upperLimitHa` (or `upperLimitHa` is null) is selected.
 * Payment formula: `flatRateGbp + ratePerUnitGbp × (eligibleArea − lowerLimitHa)`
 * @param {number} eligibleArea - The eligible area in hectares
 * @param {WmpTier[]} tiers - Payment tiers ordered ascending by lowerLimitHa
 * @returns {{ payment: number, tierIndex: number }} The payment in GBP and the 0-based index of the selected tier (-1 if none)
 */
export const calculatePayment = (eligibleArea, tiers) => {
  const roundedEligibleArea = roundTo4DecimalPlaces(eligibleArea)
  if (eligibleArea < tiers[0].lowerLimitHa) {
    return { payment: 0, tierIndex: -1 }
  }

  const tierIndex = tiers.findIndex(
    (t) => t.upperLimitHa === null || roundedEligibleArea < t.upperLimitHa
  )

  if (tierIndex === -1) {
    return { payment: 0, tierIndex: -1 }
  }

  const tier = tiers[tierIndex]
  const payment = roundTo2DecimalPlaces(
    tier.flatRateGbp +
      tier.ratePerUnitGbp * (roundedEligibleArea - tier.lowerLimitHa)
  )

  return { payment, tierIndex }
}

export const wmpCalculation = {
  /**
   * Executes the WMP payment calculation.
   * Applies the young woodland cap to determine the eligible area, then
   * selects the applicable payment tier and calculates the payment.
   * @param {WmpPaymentMethod} paymentMethod - The payment method configuration
   * @param {WmpCalculationInput} data - The application data
   * @returns {WmpCalculationResult} The eligible area and payment amount
   */
  execute: (paymentMethod, data) => {
    const { config } = paymentMethod
    const { tiers, newWoodlandMaxPercent } = config
    const { oldWoodlandAreaHa, newWoodlandAreaHa } = data.data

    const eligibleArea = calculateEligibleArea(
      oldWoodlandAreaHa,
      newWoodlandAreaHa,
      newWoodlandMaxPercent
    )

    const { payment, tierIndex } = calculatePayment(eligibleArea, tiers)
    const activeTier = tierIndex >= 0 ? tiers[tierIndex] : null

    const quantityToRemove = tierIndex > 0 ? (activeTier?.lowerLimitHa ?? 0) : 0
    const quantityInActiveTier = activeTier
      ? roundTo4DecimalPlaces(eligibleArea - quantityToRemove)
      : 0

    return {
      eligibleArea,
      payment,
      activePaymentTier: tierIndex + 1,
      quantityInActiveTier,
      activeTierRatePence: activeTier?.ratePerUnitGbp ?? 0,
      activeTierFlatRatePence: activeTier?.flatRateGbp ?? 0
    }
  }
}

/**
 * @import { WmpTier, WmpPaymentMethod, WmpCalculationInput, WmpCalculationResult } from './wmp-calculation.d.js'
 */
