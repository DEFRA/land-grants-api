import Boom from '@hapi/boom'
import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import { splitParcelId } from '~/src/api/parcel/service/parcel.service.js'
import {
  actionTransformer,
  sizeTransformer
} from '~/src/api/parcel/transformers/parcelActions.transformer.js'
import {
  parcelsSchema,
  parcelsSuccessResponseSchema
} from '~/src/api/parcel/schema/parcel.schema.js'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/api/common/schema/index.js'
import { getLandData } from '../../parcel/queries/getLandData.query.js'
import { getParcelAvailableArea } from '../../parcel/queries/getParcelAvailableArea.query.js'
import { getLandCoverCodesForCodes } from '~/src/api/land-cover-codes/queries/getLandCoverCodes.query.js'
import { getEnabledActions } from '../../actions/queries/index.js'
import { sqmToHaRounded } from '~/src/api/common/helpers/measurement.js'
import {
  createCompatibilityMatrix,
  calculateAvailableArea
} from '~/src/available-area/index.js'

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
      const { parcelIds, fields, existingActions } = request.payload
      request.logger.info(`Fetching parcels: ${parcelIds.join(', ')}`)

      const responseParcels = []

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

        const parcelResponse = {
          parcelId: landParcel['0'].parcel_id,
          sheetId: landParcel['0'].sheet_id
        }

        if (fields.includes('size')) {
          parcelResponse.size = sizeTransformer(
            sqmToHaRounded(landParcel['0'].area_sqm),
            true
          )
        }

        if (fields.some((f) => f.startsWith('actions'))) {
          const actions = await getEnabledActions(request.logger)

          if (!actions || actions?.length === 0) {
            const errorMessage = 'Actions not found'
            request.logger.error(errorMessage)
            return Boom.notFound(errorMessage)
          }

          request.logger.info(
            `Found ${actions.length} actions for parcel: ${sheetId}-${parcelId}`
          )

          const transformedActions = await Promise.all(
            actions.map(async (action) => {
              let transformed = actionTransformer(action)
              request.logger.info(`transformed: ${JSON.stringify(transformed)}`)

              request.logger.info(
                `Getting actionAvailableArea for action: ${action.code} for parcel: ${sheetId}-${parcelId}`
              )

              if (fields.includes('actions.availableArea')) {
                const landCoverCodes = await getLandCoverCodesForCodes(
                  action.landCoverClassCodes,
                  request.logger
                )
                request.logger.info(
                  `Found ${landCoverCodes.length} landCoverCodes for action: ${action.code} for parcel: ${sheetId}-${parcelId}`
                )

                const totalValidLandCoverSqm = await getParcelAvailableArea(
                  sheetId,
                  parcelId,
                  landCoverCodes,
                  request.server.postgresDb,
                  request.logger
                )

                request.logger.info(
                  `totalValidLandCoverSqm ${totalValidLandCoverSqm} for action: ${action.code} for parcel: ${sheetId}-${parcelId}`
                )

                const codes = actions.map((a) => a.code)
                request.logger.info(
                  `Found ${codes.length} codes for action: ${action.code} for parcel: ${sheetId}-${parcelId}`
                )
                const compatibilityCheckFn = await createCompatibilityMatrix(
                  codes,
                  request.logger
                )

                const availableArea = calculateAvailableArea(
                  existingActions || [],
                  { code: action.code },
                  totalValidLandCoverSqm,
                  compatibilityCheckFn
                )

                request.logger.info(
                  `availableArea ${availableArea.availableAreaHectares} for action: ${action.code} for parcel: ${sheetId}-${parcelId}`
                )

                if (availableArea || availableArea === 0) {
                  transformed = actionTransformer(
                    action,
                    availableArea,
                    fields.includes('actions.results')
                  )
                }
              }

              return transformed
            })
          )
          const sortedParcelActions = transformedActions.sort((a, b) =>
            a.code.localeCompare(b.code)
          )
          parcelResponse.actions = sortedParcelActions
        }

        responseParcels.push(parcelResponse)
      }

      return h
        .response({
          message: 'success',
          parcels: responseParcels
        })
        .code(statusCodes.ok)
    } catch (error) {
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
