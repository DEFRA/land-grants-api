import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import { splitParcelId } from '~/src/api/parcel/service/parcel.service.js'
import { getLandData } from '~/src/api/parcel/queries/getLandData.query.js'

/**
 * A generic health-check endpoint. Used by the platform to check if the service is up and handling requests.
 * @satisfies {Partial<ServerRoute>}
 */
const healthController = {
  handler: async (request, h) => {
    try {
      const { parcel } = request.query

      if (parcel) {
        const { sheetId, parcelId } = splitParcelId(parcel, request.logger)
        const landParcel = await getLandData(
          sheetId,
          parcelId,
          request.server.postgresDb,
          request.logger
        )
        return h
          .response({
            message: landParcel ? 'Database success' : 'Database failure'
          })
          .code(statusCodes.ok)
      }
    } catch (error) {
      return h.response({ message: 'Database failure' }).code(statusCodes.ok)
    }

    return h.response({ message: 'success' }).code(statusCodes.ok)
  }
}

export { healthController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
