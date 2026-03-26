import { splitParcelId } from '~/src/features/parcel/service/parcel.service.js'
import { getLandData } from '~/src/features/parcel/queries/getLandData.query.js'
import { executeRules } from '~/src/features/rules-engine/rulesEngine.js'
import { rules } from '~/src/features/rules-engine/rules/index.js'
import { getEnabledActions } from '../../actions/queries/getEnabledActions.query.js'

/**
 * @param {import('@hapi/hapi').Request} request - Hapi request object
 * @returns {Promise<import('../wmp.d.js').WMPResponse>}
 */
export const validateWoodlandManagementPlan = async (request) => {
  /** @type {import('../wmp.d.js').WMPRequest} */
  // @ts-expect-error - payload
  const { parcelIds, oldWoodlandAreaHa, newWoodlandAreaHa } = request.payload
  const {
    logger,
    // @ts-expect-error - postgresDb
    server: { postgresDb }
  } = request

  const parcels = parcelIds.map((parcelId) => splitParcelId(parcelId, logger))
  const totalParcelArea = await getTotalLandAreaSqm(parcels, request)
  const actions = await getEnabledActions(logger, postgresDb)
  const action = actions.find((a) => a.code === 'PA3')
  const ruleResult = executeRules(
    rules,
    /** @type {import('~/src/features/rules-engine/rules.d.js').RuleEngineApplication} */
    {
      oldWoodlandAreaHa,
      newWoodlandAreaHa,
      totalParcelArea
    },
    action?.rules
  )

  return { action, ruleResult }
}

export const getTotalLandAreaSqm = async (parcels, request) => {
  const area = []
  for (const parcel of parcels) {
    const result = await getLandData(
      parcel.sheetId,
      parcel.parcelId,
      request.server.postgresDb,
      request.logger
    )

    if (!result) {
      continue
    }

    const [landParcel] = result

    /** @type {LandParcelDb} */
    area.push(landParcel.area)
  }

  // sum those areas
  const totalArea = area.reduce((acc, parcel) => acc + parcel, 0)
  return totalArea
}

/**
 * @import { LandParcelDb } from '~/src/features/parcel/parcel.d.js'
 */
