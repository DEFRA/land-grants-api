import { executeRules } from '~/src/features/rules-engine/rulesEngine.js'
import { rules } from '~/src/features/rules-engine/rules/index.js'

export const executeRulesForPaymentCalculationWMP = (
  parcels,
  action,
  oldWoodlandAreaHa,
  newWoodlandAreaHa
) => {
  const totalParcelArea = sumTotalLandAreaSqm(parcels)
  const ruleResult = executeRules(
    rules,
    {
      oldWoodlandAreaHa,
      newWoodlandAreaHa,
      totalParcelArea
    },
    action?.rules
  )

  return { ruleResult, totalParcelArea }
}

export const sumTotalLandAreaSqm = (parcels) => {
  return parcels.reduce((acc, parcel) => acc + parcel.area, 0)
}

/**
 * @import { LandParcelDb } from '~/src/features/parcel/parcel.d.js'
 */
