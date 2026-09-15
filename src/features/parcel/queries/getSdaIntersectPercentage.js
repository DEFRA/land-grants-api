import { DATA_LAYER_TYPES } from '~/src/features/data-layers/queries/getDataLayer.query.js'
import { getIntersectPercentage } from '~/src/features/parcel/queries/getIntersectPercentage.js'

const SDA_REF_CODES = ['S', 'MS']

async function getSdaIntersectPercentage(sheetId, parcelId, db, logger) {
  return getIntersectPercentage(
    {
      sheetId,
      parcelId,
      refCodes: SDA_REF_CODES,
      dataLayerType: DATA_LAYER_TYPES.less_favoured_areas,
      operationName: 'Get SDA intersect percentage'
    },
    db,
    logger
  )
}

export { getSdaIntersectPercentage }
