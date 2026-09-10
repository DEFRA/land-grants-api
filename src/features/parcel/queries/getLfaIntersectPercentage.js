import { DATA_LAYER_TYPES } from '~/src/features/data-layers/queries/getDataLayer.query.js'
import { getIntersectPercentage } from '~/src/features/parcel/queries/getIntersectPercentage.js'

const LFA_REF_CODES = ['D', 'S', 'M', 'MS', 'MD']

async function getLfaIntersectPercentage(sheetId, parcelId, db, logger) {
  return getIntersectPercentage(
    {
      sheetId,
      parcelId,
      refCodes: LFA_REF_CODES,
      dataLayerType: DATA_LAYER_TYPES.less_favoured_areas,
      operationName: 'Get LFA intersect percentage'
    },
    db,
    logger
  )
}

export { getLfaIntersectPercentage }
