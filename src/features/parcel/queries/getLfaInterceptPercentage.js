import { DATA_LAYER_TYPES } from '~/src/features/data-layers/queries/getDataLayer.query.js'
import { getInterceptPercentage } from '~/src/features/parcel/queries/getInterceptPercentage.js'

const LFA_REF_CODES = ['D', 'S', 'M', 'MS', 'MD']

async function getLfaInterceptPercentage(sheetId, parcelId, db, logger) {
  return getInterceptPercentage(
    {
      sheetId,
      parcelId,
      refCodes: LFA_REF_CODES,
      dataLayerType: DATA_LAYER_TYPES.less_favoured_areas,
      operationName: 'Get LFA intercept percentage'
    },
    db,
    logger
  )
}

export { getLfaInterceptPercentage }
