import {
  haToSqm,
  roundTo2DecimalPlaces,
  roundTo4DecimalPlaces,
  sqmToHaRounded
} from '../../common/helpers/measurement.js'

/**
 * Calculates the eligible woodland area, applying the young woodland cap.
 * Young woodland (new woodland) can contribute at most `newWoodlandMaxPercent`% of
 * the total woodland area. Any excess is excluded from payment.
 * @param {number} oldWoodlandAreaSqm - Area of established woodland in square metres
 * @param {number} newWoodlandAreaSqm - Area of young woodland (under 10 years) in square metres
 * @param {number} newWoodlandMaxPercent - Maximum percentage of total area that new woodland may contribute
 * @returns {number} The eligible area in square metres
 */
export const calculateEligibleArea = (
  oldWoodlandAreaSqm,
  newWoodlandAreaSqm,
  newWoodlandMaxPercent
) => {
  const totalWoodlandAreaSqm = oldWoodlandAreaSqm + newWoodlandAreaSqm
  const maxNewWoodlandSqm = (newWoodlandMaxPercent / 100) * totalWoodlandAreaSqm
  const eligibleNewWoodlandSqm = Math.min(newWoodlandAreaSqm, maxNewWoodlandSqm)
  return Math.round(oldWoodlandAreaSqm + eligibleNewWoodlandSqm)
}

/**
 * Selects the applicable payment tier and calculates the payment for the given eligible area.
 * Returns payment of 0 and tierIndex of -1 if the area is below the first tier's lower limit (exclusive).
 * The first tier where `area < upperLimitHa` (or `upperLimitHa` is null) is selected.
 * Payment formula: `flatRateGbp + ratePerUnitGbp × (eligibleArea − lowerLimitHa)`
 * @param {number} eligibleAreaSqm - The eligible area in sqm
 * @param {WmpTier[]} tiers - Payment tiers ordered ascending by lowerLimitHa
 * @returns {{ payment: number, tierIndex: number }} The payment in GBP and the 0-based index of the selected tier (-1 if none)
 */
export const calculatePayment = (eligibleAreaSqm, tiers) => {
  if (eligibleAreaSqm < haToSqm(tiers[0].lowerLimitHa)) {
    return { payment: 0, tierIndex: -1 }
  }

  const tierIndex = tiers.findIndex(
    (t) => t.upperLimitHa === null || eligibleAreaSqm < haToSqm(t.upperLimitHa)
  )

  if (tierIndex === -1) {
    return { payment: 0, tierIndex: -1 }
  }

  const tier = tiers[tierIndex]
  const payment = roundTo2DecimalPlaces(
    tier.flatRateGbp +
      tier.ratePerUnitGbp *
        (sqmToHaRounded(eligibleAreaSqm) - tier.lowerLimitHa)
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
    const { oldWoodlandAreaSqm, newWoodlandAreaSqm } = data.data

    const eligibleAreaSqm = calculateEligibleArea(
      oldWoodlandAreaSqm,
      newWoodlandAreaSqm,
      newWoodlandMaxPercent
    )

    const { payment, tierIndex } = calculatePayment(eligibleAreaSqm, tiers)
    const activeTier = tierIndex >= 0 ? tiers[tierIndex] : null

    const quantityToRemove = tierIndex > 0 ? (activeTier?.lowerLimitHa ?? 0) : 0
    const quantityInActiveTier = activeTier
      ? roundTo4DecimalPlaces(
          sqmToHaRounded(eligibleAreaSqm) - quantityToRemove
        )
      : 0

    return {
      eligibleArea: sqmToHaRounded(eligibleAreaSqm),
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
