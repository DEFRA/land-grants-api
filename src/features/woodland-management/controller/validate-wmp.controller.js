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
import { wmpResultTransformer } from '../service/wmp.transformer.js'
import { ParcelNotFoundError } from '../errors/ParcelNotFoundError.js'

export const ValidateWMPController = {
  options: {
    tags: ['api'],
    description: 'Validate WMP',
    notes: 'Validates WMP',
    validate: {
      payload: validateWMPSchemaV2,
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
        message: 'Validate WMP',
        context: {
          parcelIds
        }
      })

      const result = await validateWoodlandManagementPlan(request)

      return h
        .response({
          message: 'success',
          result: wmpResultTransformer(result.action, result.ruleResult)
        })
        .code(statusCodes.ok)
    } catch (error) {
      if (error instanceof ParcelNotFoundError) {
        return Boom.notFound(error.message)
      }

      logBusinessError(request.logger, error)
      return Boom.internal('Failed to validate wmp')
    }
  }
}

/**
 * @import { LandParcelDb } from '~/src/features/parcel/parcel.d.js'
 */
