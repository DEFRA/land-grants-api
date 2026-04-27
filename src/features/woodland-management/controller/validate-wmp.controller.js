import Boom from '@hapi/boom'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/features/common/schema/index.js'
import {
  logInfo,
  logBusinessError
} from '~/src/features/common/helpers/logging/log-helpers.js'
import {
  validateWMPSchemaV2,
  validateWMPResponseSchemaV2
} from '../schema/validate-wmp.schema.js'
import { validateWoodlandManagementPlan } from '../service/wmp-service.js'
import { statusCodes } from '~/src/features/common/constants/status-codes.js'
import { wmpResultTransformer } from '../transformer/wmp.transformer.js'
import { getAndValidateParcels } from '../../parcel/validation/2.0.0/parcel.validation.js'
import { splitParcelId } from '../../parcel/service/2.0.0/parcel.service.js'

export const ValidateWMPController = {
  options: {
    tags: ['api'],
    description: 'Validate WMP: validate woodland management plan',
    notes: 'Validates WMP',
    validate: {
      payload: validateWMPSchemaV2
    },
    response: {
      status: {
        200: validateWMPResponseSchemaV2,
        404: errorResponseSchema,
        500: internalServerErrorResponseSchema
      }
    }
  },

  /**
   * Handler function for payment calculation
   * @param {import('@hapi/hapi').Request} request - Hapi request object
   * @returns {Promise<import('@hapi/hapi').ResponseObject | import('@hapi/boom').Boom>} Payment calculation response
   */
  handler: async (request, h) => {
    try {
      /** @type {validateWMPSchemaV2} */
      // @ts-expect-error - payload
      const { parcelIds } = request.payload

      logInfo(request.logger, {
        category: 'wmp',
        message: 'Validating WMP',
        context: {
          parcelIds
        }
      })

      const parcelSheetIds = parcelIds.map((parcelId) =>
        splitParcelId(parcelId, request.logger)
      )
      const { parcels, errors } = await getAndValidateParcels(
        parcelSheetIds,
        request
      )

      if (errors) {
        return Boom.notFound(errors)
      }

      const result = await validateWoodlandManagementPlan(
        parcels.filter((p) => p !== null),
        request
      )

      return h
        .response({
          message: 'success',
          result: wmpResultTransformer(result.action, result.ruleResult)
        })
        .code(statusCodes.ok)
    } catch (error) {
      /** @type {validateWMPSchemaV2} */
      // @ts-expect-error - payload
      const { parcelIds, oldWoodlandAreaHa, newWoodlandAreaHa } =
        request.payload
      logBusinessError(request.logger, {
        operation: 'Validation failure for WMP',
        error,
        context: {
          parcelIds: parcelIds.join(','),
          oldWoodlandAreaHa,
          newWoodlandAreaHa
        }
      })
      return Boom.internal('Error validating WMP')
    }
  }
}

/**
 * @import { LandParcelDb } from '~/src/features/parcel/parcel.d.js'
 */
