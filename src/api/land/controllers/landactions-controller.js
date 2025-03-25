import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import { getLandActionData } from '~/src/api/land/helpers/get-land-data.js'

/**
 * landactions controller
 * Finds all entries in a mongodb collection
 * @satisfies {Partial<ServerRoute>}
 */
const landActionsController = {
  handler: async (request, h) => {
    try {
      const { parcelId } = request.params
      request.logger.info(
        `Controller Fetching land actions data for parcelId ${parcelId}`
      )
      const landParcelData = await getLandActionData(parcelId, request.logger)

      return h
        .response({ message: 'success', parcel: landParcelData })
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
