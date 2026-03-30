import { executeRules } from '~/src/features/rules-engine/rulesEngine.js'
import { rules } from '~/src/features/rules-engine/rules/index.js'

/**
 * Runs the rules engine for a WMP payment calculation request and returns the
 * rule results alongside the total parcel area.
 * @param {Array<LandParcelDb | null>} parcels - The validated land parcels
 * @param {Action} action - The action whose rules are evaluated
 * @param {number} oldWoodlandAreaHa - Area of established woodland in hectares
 * @param {number} newWoodlandAreaHa - Area of young woodland (under 10 years) in hectares
 * @returns {{ ruleResult: RulesResult, totalParcelAreaSqm: number }} The rule evaluation result and total parcel area in square metres
 */
export const executeRulesForPaymentCalculationWMP = (
  parcels,
  action,
  oldWoodlandAreaHa,
  newWoodlandAreaHa
) => {
  const totalParcelAreaSqm = sumTotalLandAreaSqm(parcels)
  const ruleResult = executeRules(
    rules,
    {
      oldWoodlandAreaHa,
      newWoodlandAreaHa,
      totalParcelAreaSqm
    },
    action?.rules
  )

  return { ruleResult, totalParcelAreaSqm }
}

/**
 * Sums the area of all parcels to produce the total land area.
 * @param {Array<LandParcelDb | null>} parcels - The land parcels
 * @returns {number} The total land area in square metres
 */
export const sumTotalLandAreaSqm = (parcels) => {
  return parcels.reduce((acc, parcel) => acc + (parcel?.area ?? 0), 0)
}

/**
 * @import { LandParcelDb } from '~/src/features/parcel/parcel.d.js'
 * @import { RulesResult } from '~/src/features/rules-engine/rules.d.js'
 * @import { Action } from '~/src/features/actions/action.d.js'
 */
