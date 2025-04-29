import Joi from 'joi'
import Boom from '@hapi/boom'
import { parcelIdSchema } from '../../parcel/schema/parcel.schema.js'
import { getLandData } from '../queries/land.query.js'
import { landParcelsSuccessResponseSchema } from '../schema/land.schema.js'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '../../common/schema/index.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { landDataTransformer } from '../transformers/land.transformer.js'

/**
 * LandController
 * Returns a details
 * @satisfies {Partial<ServerRoute>}
 */
const LandController = {
  options: {
    validate: {
      params: Joi.object({
        parcelId: parcelIdSchema
      })
    },
    response: {
      status: {
        200: landParcelsSuccessResponseSchema,
        404: errorResponseSchema,
        500: internalServerErrorResponseSchema
      }
    }
  },

  handler: async (request, h) => {
    try {
      const { parcelId } = request.params

      request.logger.info(`Controller Fetching by parcelId: ${parcelId}`)

      const landParcels = await getLandData(
        parcelId,
        request.server.postgresDb,
        request.logger
      )

      if (!landParcels) {
        const errorMessage = `Land parcel not found`
        request.logger.error(errorMessage)
        return Boom.notFound(errorMessage)
      }
      const landData = landDataTransformer(landParcels)
      return h
        .response({ message: 'success', landParcels: landData })
        .code(statusCodes.ok)
    } catch (error) {
      const errorMessage = `Error fetching land parcel`
      request.logger.error(errorMessage, {
        error: error.message,
        stack: error.stack
      })
      return Boom.internal(errorMessage)
    }
  }
}

export { LandController }

/**
 * @import { ServerRegisterPluginObject } from '@hapi/hapi'
 */
