import Joi from 'joi'
import Boom from '@hapi/boom'
import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import { splitParcelId } from '~/src/api/parcel/service/parcel.service.js'
import { getActions } from '~/src/api/actions/queries/index.js'
import {
  actionTransformer,
  parcelTransformer
} from '~/src/api/parcel/transformers/parcelActions.transformer.js'
import {
  parcelIdSchema,
  parcelSuccessResponseSchema
} from '~/src/api/parcel/schema/parcel.schema.js'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/api/common/schema/index.js'
import { getLandData } from '../../land/queries/getLandData.query.js'
import { getParcelAvailableArea } from '../../land/queries/getParcelAvailableArea.query.js'
import { getLandCoverCodesForCodes } from '~/src/api/land-cover-codes/queries/getLandCoverCodes.query.js'

/**
 * ParcelController
 * Returns a single land parcel merged with land actions
 * @satisfies {Partial<ServerRoute>}
 */
const ParcelController = {
  options: {
    tags: ['api'],
    description: 'Get land parcel',
    notes:
      'Returns data for a specific parcel and includes the actions that can be made on that parcel',
    validate: {
      params: Joi.object({
        parcel: parcelIdSchema
      })
    },
    response: {
      status: {
        200: parcelSuccessResponseSchema,
        404: errorResponseSchema,
        500: internalServerErrorResponseSchema
      }
    }
  },

  handler: async (request, h) => {
    try {
      const { parcel } = request.params

      request.logger.info(`Controller Fetching land parcel`)

      const { sheetId, parcelId } = splitParcelId(parcel, request.logger)

      request.logger.info(
        `Split into sheetId ${sheetId} and parcelId ${parcelId}`
      )

      const landParcel = await getLandData(
        sheetId,
        parcelId,
        request.server.postgresDb,
        request.logger
      )

      if (!landParcel) {
        const errorMessage = `Land parcel not found`
        request.logger.error(errorMessage)
        return Boom.notFound(errorMessage)
      }

      const actions = await getActions(request.logger)
      if (!actions || actions?.length === 0) {
        const errorMessage = 'Actions not found'
        request.logger.error(errorMessage)
        return Boom.notFound(errorMessage)
      }

      const transformedActions = await Promise.all(
        (actions ?? []).map(async (action) => {
          const landCoverCodes = await getLandCoverCodesForCodes(
            actions[0].landCoverClassCodes,
            request.logger
          )
          request.logger.info(
            `Getting actionAvailableArea for ${JSON.stringify({
              sheetId,
              parcelId,
              landCoverCodes
            })}`
          )
          const actionAvailableArea = await getParcelAvailableArea(
            sheetId,
            parcelId,
            landCoverCodes,
            request.server.postgresDb,
            request.logger
          )

          return {
            ...actionTransformer(action, actionAvailableArea)
          }
        })
      )

      if (!transformedActions) {
        const errorMessage = `Available area calculation failed`
        request.logger.error(errorMessage)
        return Boom.notFound(errorMessage)
      }
      const sortedParcelActions = transformedActions.sort((a, b) =>
        a.code.localeCompare(b.code)
      )
      const parcelActions = parcelTransformer(
        landParcel['0'],
        sortedParcelActions
      )

      return h
        .response({ message: 'success', ...parcelActions })
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

export { ParcelController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
