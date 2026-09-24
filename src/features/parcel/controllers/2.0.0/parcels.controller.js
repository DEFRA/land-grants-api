import Boom from '@hapi/boom'
import { statusCodes } from '~/src/features/common/constants/status-codes.js'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/features/common/schema/index.js'
import {
  parcelsSchema,
  parcelsSuccessResponseSchema
} from '~/src/features/parcel/schema/2.0.0/parcel.schema.js'
import { getDataAndValidateRequest } from '../../validation/2.0.0/parcel.validation.js'
import { createCompatibilityMatrix } from '~/src/features/available-area/compatibilityMatrix.js'
import {
  logBusinessError,
  logInfo,
  logValidationWarn
} from '~/src/features/common/helpers/logging/log-helpers.js'
import {
  getActionsForParcel,
  getActionsForParcelWithSSSIConsentRequired,
  getActionsForParcelWithHEFERConsentRequired
} from '../../service/2.0.0/parcel.service.js'
import { actionGroupsTransformer } from '../../transformers/2.0.0/group.transformer.js'
import { getAgreements } from '~/src/features/agreements/repo.js'
import { expiredActionsFilter } from '~/src/features/agreements/transformers/filters.js'

/**
 * Validate SSSI consent required
 * @param {string[]} parcelIds - The parcelIds
 * @param {string[]} fields - The fields
 * @returns {undefined | import('@hapi/boom').Boom} The error message
 */
const validateSSSIConsentRequired = (parcelIds, fields) => {
  if (parcelIds.length > 1 && fields.includes('actions.sssiConsentRequired')) {
    return Boom.badRequest(
      'SSSI consent required is not supported for multiple parcels.'
    )
  }
  return undefined
}

/**
 * Validate HEFER consent required
 * @param {string[]} parcelIds - The parcelIds
 * @param {string[]} fields - The fields
 * @returns {undefined | import('@hapi/boom').Boom} The error message
 */
const validateHEFERConsentRequired = (parcelIds, fields) => {
  if (parcelIds.length > 1 && fields.includes('actions.heferRequired')) {
    return Boom.badRequest(
      'HEFER required is not supported for multiple parcels.'
    )
  }
  return undefined
}

/**
 * ParcelsController
 * Returns a single land parcel merged with land actions
 * @satisfies {Partial<ServerRoute>}
 */
const ParcelsControllerV2 = {
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
      const { parcelIds, fields, sbi } = request.payload
      logInfo(request.logger, {
        category: 'parcel',
        message: 'Fetch parcels',
        context: {
          parcelIds: parcelIds.join(','),
          fields: fields.join(',')
        }
      })

      const defraIdToken = /** @type {string} */ (
        request.headers['x-forwarded-authorization']
      )
      if (!defraIdToken) {
        return Boom.unauthorized('X-Forwarded-Authorization is required')
      }

      const sssiConsentRequiredError = validateSSSIConsentRequired(
        parcelIds,
        fields
      )
      if (sssiConsentRequiredError) {
        return sssiConsentRequiredError
      }

      const heferConsentRequiredError = validateHEFERConsentRequired(
        parcelIds,
        fields
      )
      if (heferConsentRequiredError) {
        return heferConsentRequiredError
      }

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

      /** @type {AgreementsByParcel} */
      let agreements = {}
      if (fields.some((f) => f.startsWith('actions'))) {
        agreements = await getAgreements(
          sbi,
          validationResponse.parcels.map((p) => [p.parcel_id, p.sheet_id]),
          defraIdToken,
          postgresDb,
          request.logger
        )
      }

      const responseParcels = await Promise.all(
        validationResponse.parcels.map(async (parcel) => {
          return getActionsForParcel(
            parcel,
            request.payload,
            showActionResults,
            validationResponse.enabledActions,
            compatibilityCheckFn,
            request,
            (agreements[`${parcel.parcel_id}-${parcel.sheet_id}`] || []).filter(
              (a) => expiredActionsFilter(a)
            )
          )
        })
      )

      let transformedResponseParcels = responseParcels

      if (fields.includes('actions.sssiConsentRequired')) {
        transformedResponseParcels =
          await getActionsForParcelWithSSSIConsentRequired(
            parcelIds,
            responseParcels,
            validationResponse.enabledActions,
            request.logger,
            postgresDb
          )
      }

      if (fields.includes('actions.heferRequired')) {
        transformedResponseParcels =
          await getActionsForParcelWithHEFERConsentRequired(
            parcelIds,
            transformedResponseParcels,
            validationResponse.enabledActions,
            request.logger,
            postgresDb
          )
      }

      let transformedGroups

      if (fields.includes('groups')) {
        transformedGroups = actionGroupsTransformer(
          validationResponse.enabledActions
        )
      }

      return h
        .response({
          message: 'success',
          parcels: transformedResponseParcels,
          groups: transformedGroups
        })
        .code(statusCodes.ok)
    } catch (error) {
      if (error.statusCode) {
        return Boom.boomify(error, { statusCode: error.statusCode })
      }
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
 * @import { AgreementsByParcel } from '~/src/features/agreements/agreements.d.js'
 */
