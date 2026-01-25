import Boom from '@hapi/boom'
import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/api/common/schema/index.js'
import { parcelsSuccessResponseSchemaV2 } from '~/src/api/parcel/schema/2.0.0/parcel.schema.js'
import { parcelsSchema } from '~/src/api/parcel/schema/1.0.0/parcel.schema.js'
import { getDataAndValidateRequest } from '../../validation/2.0.0/parcel.validation.js'
import { createCompatibilityMatrix } from '~/src/available-area/compatibilityMatrix.js'
import {
  logBusinessError,
  logInfo,
  logValidationWarn
} from '~/src/api/common/helpers/logging/log-helpers.js'
import {
  getActionsForParcel,
  getActionsForParcelWithSSSIConsentRequired
} from '../../service/parcel.service.js'

/**
 * ParcelsController
 * Returns a single land parcel merged with land actions
 * @satisfies {Partial<ServerRoute>}
 */
const ParcelsControllerV2 = {
  options: {
    tags: ['api/v2'],
    description: 'Get multiple land parcels with selected fields',
    notes:
      'Returns data for multiple parcels and includes the requested fields',
    validate: {
      payload: parcelsSchema
    },
    response: {
      status: {
        200: parcelsSuccessResponseSchemaV2,
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

      let transformedResponseParcels = responseParcels

      if (
        parcelIds.length === 1 &&
        fields.includes('actions.sssiConsentRequired')
      ) {
        transformedResponseParcels =
          await getActionsForParcelWithSSSIConsentRequired(
            parcelIds,
            responseParcels,
            validationResponse.enabledActions,
            request.logger,
            postgresDb
          )
      }

      return h
        .response({
          message: 'success',
          parcels: transformedResponseParcels
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
export { ParcelsControllerV2 }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
