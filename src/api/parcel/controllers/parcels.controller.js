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
import { getParcelActionsWithAvailableArea } from '~/src/api/parcel/service/parcel.service.js'
import { sizeTransformer } from '~/src/api/parcel/transformers/parcelActions.transformer.js'
import { getAgreementsForParcel } from '~/src/api/agreements/queries/getAgreementsForParcel.query.js'
import { mergeAgreementsTransformer } from '~/src/api/agreements/transformers/agreements.transformer.js'
import { getDataAndValidateRequest } from '../validation/parcel.validation.js'
import { createCompatibilityMatrix } from '~/src/available-area/compatibilityMatrix.js'
import {
  logBusinessError,
  logInfo,
  logValidationWarn
} from '~/src/api/common/helpers/logging/log-helpers.js'

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
      const postgresDb = request.server.postgresDb
      // @ts-expect-error - payload
      const { parcelIds, fields } = request.payload
      logInfo(request.logger, {
        category: 'parcel',
        message: 'Fetch parcels',
        context: {
          parcelIds: parcelIds.join(','),
          fields: fields.join(',')
        }
      })

      const showActionResults = fields.includes('actions.results')

      const validationResponse = await getDataAndValidateRequest(
        parcelIds,
        request
      )

      if (validationResponse.errors && validationResponse.errors.length > 0) {
        logValidationWarn(request.logger, {
          operation: 'Parcel validation',
          errors: validationResponse.errors,
          context: {
            parcelIds: parcelIds.join(','),
            fields: fields.join(',')
          }
        })
        return Boom.notFound(validationResponse.errors.join(', '))
      }

      const compatibilityCheckFn = await createCompatibilityMatrix(
        request.logger,
        postgresDb
      )

      const responseParcels = await Promise.all(
        validationResponse.parcels.map(async (parcel) => {
          return getActionsForParcel(
            parcel,
            request.payload,
            showActionResults,
            validationResponse.enabledActions,
            compatibilityCheckFn,
            request
          )
        })
      )

      logInfo(request.logger, {
        category: 'parcels',
        message: 'Get parcels information',
        context: {
          parcels: JSON.stringify(responseParcels)
        }
      })

      return h
        .response({
          message: 'success',
          parcels: responseParcels
        })
        .code(statusCodes.ok)
    } catch (error) {
      const errorMessage = 'Error fetching parcels'
      // @ts-expect-error - payload
      const { parcelIds, fields } = request.payload
      logBusinessError(request.logger, {
        operation: 'Fetch parcels',
        error,
        context: {
          parcelIds: parcelIds.join(','),
          fields: fields.join(',')
        }
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
  enabledActions,
  compatibilityCheckFn,
  request
) {
  const { fields, plannedActions } = payload
  const agreements = await getAgreementsForParcel(
    parcel.sheet_id,
    parcel.parcel_id,
    request.server.postgresDb,
    request.logger
  )

  const mergedActions = mergeAgreementsTransformer(agreements, plannedActions)

  const parcelResponse = {
    parcelId: parcel.parcel_id,
    sheetId: parcel.sheet_id
  }

  if (fields.includes('size')) {
    parcelResponse.size = sizeTransformer(sqmToHaRounded(parcel.area_sqm))
  }

  if (fields.some((f) => f.startsWith('actions'))) {
    const actionsWithAvailableArea = await getParcelActionsWithAvailableArea(
      parcel,
      mergedActions,
      showActionResults,
      enabledActions,
      compatibilityCheckFn,
      request.server.postgresDb,
      request.logger
    )

    const sortedParcelActions = actionsWithAvailableArea.toSorted((a, b) =>
      a.code.localeCompare(b.code)
    )

    parcelResponse.actions = sortedParcelActions
  }
  return parcelResponse
}
