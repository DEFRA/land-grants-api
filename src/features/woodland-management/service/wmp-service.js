import { splitParcelId } from '~/src/features/parcel/service/parcel.service.js'
import { getLandData } from '~/src/features/parcel/queries/getLandData.query.js'
import { executeRules } from '~/src/features/rules-engine/rulesEngine.js'
import { rules } from '~/src/features/rules-engine/rules/index.js'
import { getEnabledActions } from '../../actions/queries/getEnabledActions.query.js'
import { wmpResultTransformer } from './wmp.transformer.js'

export const validateWoodlandManagementPlan = async (request) => {
  const { parcelIds, oldWoodlandAreaHa, newWoodlandAreaHa } = request.payload
  const {
    logger,
    server: { postgresDb }
  } = request

  const parcels = parcelIds.map((parcelId) => splitParcelId(parcelId, logger))

  const totalParcelArea = await getTotalLandAreaSqm(parcels, request)

  const actions = await getEnabledActions(logger, postgresDb)
  const action = actions.find((a) => a.code === 'PA3')
  const ruleResult = executeRules(
    rules,
    {
      oldWoodlandAreaHa,
      newWoodlandAreaHa,
      totalParcelArea
    },
    action?.rules
  )

  return wmpResultTransformer(action, ruleResult)
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
 * @import { WMPRequest } from '../wmp.d.js'
 * @import { LandParcelDb } from '~/src/features/parcel/parcel.d.js'
 */
