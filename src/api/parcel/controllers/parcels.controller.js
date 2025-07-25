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
import { splitParcelId } from '~/src/api/parcel/service/parcel.service.js'
import {
  actionTransformer,
  plannedActionsTransformer,
  sizeTransformer
} from '~/src/api/parcel/transformers/parcelActions.transformer.js'
import {
  getAvailableAreaDataRequirements,
  getAvailableAreaForAction
} from '~/src/available-area/availableArea.js'
import { createCompatibilityMatrix } from '~/src/available-area/compatibilityMatrix.js'
import { getEnabledActions } from '../../actions/queries/index.js'
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
          const actions = await getEnabledActions(
            request.logger,
            request.server.postgresDb
          )

          if (!actions || actions?.length === 0) {
            const errorMessage = 'Actions not found'
            request.logger.error(errorMessage)
            return Boom.notFound(errorMessage)
          }

          request.logger.info(`Found ${actions.length} action configs from DB`)

          const compatibilityCheckFn = await createCompatibilityMatrix(
            request.logger,
            request.server.postgresDb
          )

          const actionsWithAvailableArea = []

          for (const action of actions) {
            if (!action.display) {
              request.logger.debug(
                `Action ${action.code} is not displayed, skipping`
              )
              continue
            }

            const aacDataRequirements = await getAvailableAreaDataRequirements(
              action.code,
              sheetId,
              parcelId,
              plannedActionsTransformer(mergedActions),
              request.server.postgresDb,
              request.logger
            )

            const availableArea = getAvailableAreaForAction(
              action.code,
              sheetId,
              parcelId,
              compatibilityCheckFn,
              plannedActionsTransformer(mergedActions),
              aacDataRequirements,
              request.logger
            )

            const actionWithAvailableArea = actionTransformer(
              action,
              availableArea,
              fields.includes('actions.results')
            )

            actionsWithAvailableArea.push(actionWithAvailableArea)
          }

          const sortedParcelActions = actionsWithAvailableArea.sort((a, b) =>
            a.code.localeCompare(b.code)
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
