import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import { getLandActionData } from '~/src/api/land/helpers/get-land-data.js'
import { enrichLandActionsData } from '~/src/api/land/service/available-area-calculation-service.js'

/**
 * landactions controller
 * Finds all entries in a mongodb collection
 * @satisfies {Partial<ServerRoute>}
 */
const landActionsController = {
  handler: async (request, h) => {
    try {
      const { parcel } = request.params
      request.logger.info(
        `Controller Fetching land actions data for parcel ${parcel}`
      )
      const landParcelData = await getLandActionData(parcel, request.logger)
      const enrichedLandActionsData = enrichLandActionsData(landParcelData)
      return h
        .response({ message: 'success', ...enrichedLandActionsData })
        .code(statusCodes.ok)
    } catch (error) {
      request.logger.error(`Error fetching land actions: ${error.message}`)
      return h
        .response({
          message: 'Failed to get land actions data ',
          error: error.message
        })
        .code(statusCodes.notFound)
    }
  }
}

export { landActionsController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
