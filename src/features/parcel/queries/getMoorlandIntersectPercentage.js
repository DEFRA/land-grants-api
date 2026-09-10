import { DATA_LAYER_TYPES } from '~/src/features/data-layers/queries/getDataLayer.query.js'
import { getIntersectPercentage } from '~/src/features/parcel/queries/getIntersectPercentage.js'

const MOORLAND_REF_CODES = ['M', 'MS', 'MD']

async function getMoorlandIntersectPercentage(sheetId, parcelId, db, logger) {
  return getIntersectPercentage(
    {
      sheetId,
      parcelId,
      refCodes: MOORLAND_REF_CODES,
      dataLayerType: DATA_LAYER_TYPES.less_favoured_areas,
      operationName: 'Get moorland intersect percentage'
    },
    db,
    logger
  )
}

export { getMoorlandIntersectPercentage }
