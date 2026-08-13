import Boom from '@hapi/boom'
import { statusCodes } from '~/src/features/common/constants/status-codes.js'
import {
  logBusinessError,
  logInfo
} from '~/src/features/common/helpers/logging/log-helpers.js'
import {
  parcelTilesParamsSchema,
  parcelTilesPayloadSchema
} from '~/src/features/vector-tiles/schema/parcelTiles.schema.js'
import { parseParcelIds } from '~/src/features/vector-tiles/service/parcelTiles.service.js'
import { getParcelMvt } from '~/src/features/vector-tiles/queries/getParcelMvt.query.js'

const MVT_CONTENT_TYPE = 'application/vnd.mapbox-vector-tile'

/**
 * ParcelTilesController
 * Serves a Mapbox Vector Tile containing the requested land parcels.
 * Geometry is transformed from EPSG:27700 (BNG) to EPSG:3857 (Web Mercator)
 * using PostGIS's default datum shift. OSTN15 accuracy is a follow-up.
 * @satisfies {Partial<ServerRoute>}
 */
const ParcelTilesController = {
  options: {
    tags: ['api'],
    description:
      'Get a Mapbox Vector Tile containing the requested land parcels',
    notes:
      'Returns an MVT (application/vnd.mapbox-vector-tile) for the given z/x/y tile, containing the polygons of the parcels whose ids are supplied in the request body.',
    validate: {
      params: parcelTilesParamsSchema,
      payload: parcelTilesPayloadSchema
    }
  },

  /**
   * @param {import('@hapi/hapi').Request} request
   * @param {import('@hapi/hapi').ResponseToolkit} h
   */
  handler: async (request, h) => {
    const z = Number(request.params.z)
    const x = Number(request.params.x)
    const y = Number(request.params.y)
    // @ts-expect-error - payload
    const { parcelIds } = request.payload

    try {
      // @ts-expect-error - postgresDb
      const postgresDb = request.server.postgresDb

      logInfo(request.logger, {
        category: 'vector-tiles',
        message: 'Fetch parcel tile',
        context: { z, x, y, idCount: parcelIds.length }
      })

      const { sheetIds, parcelKeys } = parseParcelIds(parcelIds)

      const tileBuffer = await getParcelMvt(
        { z, x, y, sheetIds, parcelKeys },
        postgresDb,
        request.logger
      )

      return h.response(tileBuffer).type(MVT_CONTENT_TYPE).code(statusCodes.ok)
    } catch (error) {
      logBusinessError(request.logger, {
        operation: 'Fetch parcel tile',
        error,
        context: { z, x, y, idCount: parcelIds.length }
      })
      return Boom.internal('Error generating parcel vector tile')
    }
  }
}

export { ParcelTilesController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
