import { executeRules } from '~/src/features/rules-engine/rulesEngine.js'
import { rules } from '~/src/features/rules-engine/rules/index.js'
import { getEnabledActions } from '../../actions/queries/getEnabledActions.query.js'

/**
 * @param {LandParcelDb[]|null} parcels - The parcels
 * @param {import('@hapi/hapi').Request} request - Hapi request object
 * @returns {Promise<import('../wmp.d.js').WMPResponse>}
 */
export const validateWoodlandManagementPlan = async (parcels, request) => {
  /** @type {import('../wmp.d.js').WMPRequest} */
  // @ts-expect-error - payload
  const { oldWoodlandAreaHa, newWoodlandAreaHa } = request.payload
  const {
    logger,
    // @ts-expect-error - postgresDb
    server: { postgresDb }
  } = request

  const totalParcelAreaSqm = getTotalLandAreaSqm(parcels)
  const actions = await getEnabledActions(logger, postgresDb)
  const action = actions.find((a) => a.code === 'PA3')
  const ruleResult = executeRules(
    rules,
    /** @type {import('~/src/features/rules-engine/rules.d.js').RuleEngineApplication} */
    {
      oldWoodlandAreaHa,
      newWoodlandAreaHa,
      totalParcelAreaSqm
    },
    action?.rules
  )

  return { action, ruleResult }
}

/**
 * @param {LandParcelDb[]|null} parcels - The parcels
 * @returns {number} The total land area in square meters
 */
export const getTotalLandAreaSqm = (parcels) => {
  return parcels?.reduce((acc, parcel) => acc + parcel.area, 0) ?? 0
}

/**
 * @import { LandParcelDb } from '~/src/features/parcel/parcel.d.js'
 */
