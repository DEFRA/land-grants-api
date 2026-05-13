import Boom from '@hapi/boom'
import { statusCodes } from '~/src/features/common/constants/status-codes.js'
import {
  logBusinessError,
  logInfo
} from '~/src/features/common/helpers/logging/log-helpers.js'
import { parcelTilesLocatePayloadSchema } from '~/src/features/vector-tiles/schema/parcelTilesLocate.schema.js'
import { parseParcelIds } from '~/src/features/vector-tiles/service/parcelTiles.service.js'
import { locateParcelTile } from '~/src/features/vector-tiles/service/locateParcelTile.service.js'
import { getParcelExtent } from '~/src/features/vector-tiles/queries/getParcelExtent.query.js'

/**
 * ParcelTilesLocateController
 * Given a list of land parcel ids, returns the smallest XYZ Web Mercator tile
 * that contains all of their geometries with a small visual margin. The result
 * is intended to be fed straight into the existing /api/v1/parcel-tiles/{z}/{x}/{y}
 * endpoint.
 * @satisfies {Partial<ServerRoute>}
 */
const ParcelTilesLocateController = {
  options: {
    tags: ['api'],
    description:
      'Locate the XYZ tile that frames the given land parcels with padding',
    notes:
      'Returns { message, tile: { z, x, y } } for the smallest Web Mercator tile that contains the union extent of the requested parcels.',
    validate: {
      payload: parcelTilesLocatePayloadSchema
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

      const tile = locateParcelTile(bbox)

      return h.response({ message: 'success', tile }).code(statusCodes.ok)
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
