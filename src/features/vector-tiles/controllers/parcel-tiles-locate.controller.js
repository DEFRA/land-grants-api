import Boom from '@hapi/boom'
import { statusCodes } from '~/src/features/common/constants/status-codes.js'
import {
  logBusinessError,
  logInfo
} from '~/src/features/common/helpers/logging/log-helpers.js'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/features/common/schema/index.js'
import {
  parcelTilesLocatePayloadSchema,
  parcelTilesLocateSuccessResponseSchema
} from '~/src/features/vector-tiles/schema/parcel-tiles-locate.schema.js'
import { parseParcelIds } from '~/src/features/vector-tiles/service/parcel-tiles.service.js'
import { getParcelExtent } from '~/src/features/vector-tiles/queries/getParcelExtent.query.js'

/**
 * ParcelTilesLocateController
 * Given a list of land parcel ids, returns the WGS84 bounding box containing
 * the union of their geometries, for a client to fit its map viewport to.
 * @satisfies {Partial<ServerRoute>}
 */
const ParcelTilesLocateController = {
  options: {
    tags: ['api'],
    description: 'Get the WGS84 bounding box containing the given land parcels',
    notes:
      'Returns { message, bbox: { minLng, minLat, maxLng, maxLat } } for the WGS84 bounding box of the union extent of the requested parcels.',
    validate: {
      payload: parcelTilesLocatePayloadSchema
    },
    response: {
      status: {
        200: parcelTilesLocateSuccessResponseSchema,
        404: errorResponseSchema,
        500: internalServerErrorResponseSchema
      }
    }
  },

  /**
   * @param {import('@hapi/hapi').Request} request
   * @param {import('@hapi/hapi').ResponseToolkit} h
   */
  handler: async (request, h) => {
    // @ts-expect-error - payload
    const { parcelIds } = request.payload

    try {
      // @ts-expect-error - postgresDb
      const postgresDb = request.server.postgresDb

      logInfo(request.logger, {
        category: 'vector-tiles',
        message: 'Locate parcel tile',
        context: { idCount: parcelIds.length }
      })

      const { sheetIds, parcelKeys } = parseParcelIds(parcelIds)

      const { foundCount, bbox } = await getParcelExtent(
        { sheetIds, parcelKeys },
        postgresDb,
        request.logger
      )

      if (foundCount === 0 || !bbox) {
        return Boom.notFound('No matching parcels found')
      }

      return h.response({ message: 'success', bbox }).code(statusCodes.ok)
    } catch (error) {
      logBusinessError(request.logger, {
        operation: 'Locate parcel tile',
        error,
        context: { idCount: parcelIds.length }
      })
      return Boom.internal('Error locating parcel tile')
    }
  }
}

export { ParcelTilesLocateController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
