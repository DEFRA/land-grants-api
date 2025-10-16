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
import { getAgreementsForParcel } from '~/src/api/agreements/queries/getAgreementsForParcel.query.js'
import { mergeAgreementsTransformer } from '~/src/api/agreements/transformers/agreements.transformer.js'
import { getLandData } from '~/src/api/parcel/queries/getLandData.query.js'
import {
  logBusinessError,
  logInfo,
  logResourceNotFound
} from '../../common/helpers/logging/log-helpers.js'

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

  /**
   * Handler function for application validation
   * @param {import('@hapi/hapi').Request} request - Hapi request object
   * @param {import('@hapi/hapi').ResponseToolkit} h - Hapi response toolkit
   * @returns {Promise<import('@hapi/hapi').ResponseObject | import('@hapi/boom').Boom>} Validation response
   */
  handler: async (request, h) => {
    try {
      // @ts-expect-error - postgresDb
      const { parcelIds, fields } = request.payload
      logInfo(request.logger, {
        category: 'parcel',
        operation: 'Fetch parcels',
        reference: `parcelIds:${parcelIds.join(',')}`
      })

      const responseParcels = []
      const showActionResults = fields.includes('actions.results')

      for (const parcel of parcelIds) {
        const { parcelResponse, error } = await getActionsForParcel(
          parcel,
          request.payload,
          showActionResults,
          request
        )
        if (error) {
          return Boom.notFound(error)
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
      if (error instanceof Error && error.message === 'Actions not found') {
        return Boom.notFound(error.message)
      }
      // @ts-expect-error - postgresDb
      const { parcelIds } = request.payload
      const errorMessage = 'Error fetching parcels'
      logBusinessError(request.logger, {
        operation: 'Fetch parcels',
        error,
        reference: `parcelIds:${parcelIds.join(',')}`
      })
      return Boom.internal(errorMessage)
    }
  }
}
export { ParcelsController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */

async function getActionsForParcel(
  parcel,
  payload,
  showActionResults,
  request
) {
  const { fields, plannedActions } = payload
  const { sheetId, parcelId } = splitParcelId(parcel, request.logger)

  const landParcel = await getLandData(
    sheetId,
    parcelId,
    request.server.postgresDb,
    request.logger
  )

  if (!landParcel || landParcel.length === 0) {
    logResourceNotFound(request.logger, {
      resourceType: 'Land parcel',
      reference: `sheetId:${sheetId},parcelId:${parcelId}`
    })
    return { parcelResponse: null, error: `Land parcel not found: ${parcel}` }
  }

  const agreements = await getAgreementsForParcel(
    sheetId,
    parcelId,
    request.server.postgresDb,
    request.logger
  )

  const mergedActions = mergeAgreementsTransformer(agreements, plannedActions)

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
    const actionsWithAvailableArea = await getParcelActionsWithAvailableArea(
      sheetId,
      parcelId,
      mergedActions,
      showActionResults,
      request.server.postgresDb,
      request.logger
    )

    const sortedParcelActions = actionsWithAvailableArea.toSorted((a, b) =>
      a.code.localeCompare(b.code)
    )

    parcelResponse.actions = sortedParcelActions
  }
  return { parcelResponse, error: null }
}
