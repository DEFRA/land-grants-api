// import Joi from 'joi'
import Boom from '@hapi/boom'
import { getParcelAvailableArea } from '../queries/land.query.js'
// import { landParcelsSuccessResponseSchema } from '../schema/land.schema.js'
// import {
//   errorResponseSchema,
//   internalServerErrorResponseSchema
// } from '../../common/schema/index.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { splitParcelId } from '../../parcel/service/parcel.service.js'

/**
 * LandAreaController
 * Returns a details
 * @satisfies {Partial<ServerRoute>}
 */
const LandAreaController = {
  // options: {
  //   tags: ['api'],
  //   description: 'Provides land parcel information',
  //   notes:
  //     'Provides latest land parcel information, land size and area size',
  //     validate: {
  //     params: Joi.object({
  //       landParcelId: parcelIdSchema
  //     })
  //   },
  //   response: {
  //     status: {
  //       200: landParcelsSuccessResponseSchema,
  //       404: errorResponseSchema,
  //       500: internalServerErrorResponseSchema
  //     }
  //   }
  // },

  handler: async (request, h) => {
    try {
      const { landParcelId } = request.params
      const { coverCodes } = request.payload

      // Validation (optional but recommended)
      if (!Array.isArray(coverCodes)) {
        // return h.response({ error: 'Invalid coverCodes. Must be an array of strings.' }).code(400);
        const errorMessage = `CoverCodes, missing in the body.`
        request.logger.error(errorMessage)
        return Boom.notFound(errorMessage)
      }
      request.logger.info(
        `Controller finding land data by landParcelId: ${landParcelId}`
      )

      const { sheetId, parcelId } = splitParcelId(landParcelId, request.logger)
      request.logger.info(
        `Calculating area for sheetId: ${sheetId}, parcelId: ${parcelId}`
      )
      request.logger.info({ coverCodes }, 'Land cover codes received')

      const availableArea = await getParcelAvailableArea(
        sheetId,
        parcelId,
        coverCodes,
        request.server.postgresDb,
        request.logger
      )

      if (!availableArea) {
        const errorMessage = `Aailable area calculation failed`
        request.logger.error(errorMessage)
        return Boom.notFound(errorMessage)
      }

      return h
        .response({ message: 'success', availableArea })
        .code(statusCodes.ok)
    } catch (error) {
      const errorMessage = `Error calculation land available area`
      request.logger.error(errorMessage, {
        error: error.message,
        stack: error.stack
      })
      return Boom.internal(errorMessage)
    }
  }
}

export { LandAreaController }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
