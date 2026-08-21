import { DATA_LAYER_TYPES } from '~/src/features/data-layers/queries/getDataLayer.query.js'
import { getInterceptPercentage } from '~/src/features/parcel/queries/getInterceptPercentage.js'

const MOORLAND_REF_CODES = ['M', 'MS', 'MD']

async function getMoorlandInterceptPercentage(sheetId, parcelId, db, logger) {
  return getInterceptPercentage(
    {
      sheetId,
      parcelId,
      refCodes: MOORLAND_REF_CODES,
      dataLayerType: DATA_LAYER_TYPES.less_favoured_areas,
      operationName: 'Get moorland intercept percentage'
    },
    db,
    logger
  )
}

export { getMoorlandInterceptPercentage }
