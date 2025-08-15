import Boom from '@hapi/boom'
import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import { sqmToHaRounded } from '~/src/api/common/helpers/measurement.js'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/api/common/schema/index.js'
import {
  parcelsSchema,
  parcelsSuccessResponseSchema
} from '~/src/api/parcel/schema/parcel.schema.js'
import {
  splitParcelId,
  getParcelActionsWithAvailableArea
} from '~/src/api/parcel/service/parcel.service.js'
import { sizeTransformer } from '~/src/api/parcel/transformers/parcelActions.transformer.js'
import { getAgreementsForParcel } from '../../agreements/queries/getAgreementsForParcel.query.js'
import { mergeAgreementsTransformer } from '../../agreements/transformers/agreements.transformer.js'
import { getLandData } from '../../parcel/queries/getLandData.query.js'

/**
 * ParcelsController
 * Returns a single land parcel merged with land actions
 * @satisfies {Partial<ServerRoute>}
 */
const ParcelsController = {
  options: {
    tags: ['api'],
    description: 'Get multiple land parcels with selected fields',
    notes:
      'Returns data for multiple parcels and includes the requested fields',
    validate: {
      payload: parcelsSchema
    },
    response: {
      status: {
        200: parcelsSuccessResponseSchema,
        404: errorResponseSchema,
        500: internalServerErrorResponseSchema
      }
    }
  },

  handler: async (request, h) => {
    try {
      const { parcelIds, fields, plannedActions } = request.payload
      request.logger.info(`Fetching parcels: ${parcelIds.join(', ')}`)

      const responseParcels = []
      const showActionResults = fields.includes('actions.results')

      for (const parcel of parcelIds) {
        const { sheetId, parcelId } = splitParcelId(parcel, request.logger)
        const landParcel = await getLandData(
          sheetId,
          parcelId,
          request.server.postgresDb,
          request.logger
        )

        if (!landParcel || landParcel.length === 0) {
          const errorMessage = `Land parcel not found: ${parcel}`
          request.logger.error(errorMessage)
          return Boom.notFound(errorMessage)
        }

        const agreements = await getAgreementsForParcel(
          sheetId,
          parcelId,
          request.server.postgresDb,
          request.logger
        )

        const mergedActions = mergeAgreementsTransformer(
          agreements,
          plannedActions
        )

        request.logger.info(
          `Merged actions for parcel ${sheetId}-${parcelId}:`,
          mergedActions
        )

        const parcelResponse = {
          parcelId: landParcel['0'].parcel_id,
          sheetId: landParcel['0'].sheet_id
        }

        if (fields.includes('size')) {
          parcelResponse.size = sizeTransformer(
            sqmToHaRounded(landParcel['0'].area_sqm)
          )
        }

        if (fields.some((f) => f.startsWith('actions'))) {
          const actionsWithAvailableArea =
            await getParcelActionsWithAvailableArea(
              sheetId,
              parcelId,
              mergedActions,
              showActionResults,
              request.server.postgresDb,
              request.logger
            )

          const sortedParcelActions = actionsWithAvailableArea.toSorted(
            (a, b) => a.code.localeCompare(b.code)
          )

          parcelResponse.actions = sortedParcelActions
        }
        responseParcels.push(parcelResponse)
      }

      request.logger.info('PARCELS RESPONSE', responseParcels)

      return h
        .response({
          message: 'success',
          parcels: responseParcels
        })
        .code(statusCodes.ok)
    } catch (error) {
      if (error instanceof Error && error.message === 'Actions not found') {
        return Boom.notFound(error.message)
      }

      const errorMessage = 'Error fetching parcels'
      request.logger.error(errorMessage, {
        error: error.message,
        stack: error.stack
      })
      return Boom.internal(errorMessage)
    }
  }
}
export { ParcelsController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
