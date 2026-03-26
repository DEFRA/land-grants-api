import Boom from '@hapi/boom'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/features/common/schema/index.js'
import {
  paymentCalculateWMPSchemaV2,
  paymentCalculateWMPResponseSchemaV2
} from '../schema/payment-calculate-wmp.schema.js'
import { logInfo } from '~/src/features/common/helpers/logging/log-helpers.js'
import { validateWoodlandManagementPlan } from '../service/wmp-service.js'
import { statusCodes } from '~/src/features/common/constants/status-codes.js'
import { wmpResultTransformer } from '../service/wmp.transformer.js'

export const PaymentsCalculateWMPControllerV2 = {
  options: {
    tags: ['api'],
    description: 'Calculate WMP payment',
    notes: 'Calculates payment amounts for WMP',
    validate: {
      payload: paymentCalculateWMPSchemaV2
    },
    response: {
      status: {
        200: paymentCalculateWMPResponseSchemaV2,
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
    /** @type {paymentCalculateWMPSchemaV2} */
    // @ts-expect-error - payload
    const { parcelIds, oldWoodlandAreaHa, newWoodlandAreaHa, startDate } =
      request.payload

    console.log('parcelIds', parcelIds)
    console.log('oldWoodlandAreaHa', oldWoodlandAreaHa)
    console.log('newWoodlandAreaHa', newWoodlandAreaHa)
    console.log('startDate', startDate)

    logInfo(request.logger, {
      category: 'wmp',
      message: 'Payment Calculate WMP',
      context: {
        parcelIds,
        oldWoodlandAreaHa,
        newWoodlandAreaHa,
        startDate
      }
    })

    const result = await validateWoodlandManagementPlan(request)

    return h
      .response({
        message: 'success',
        result: wmpResultTransformer(result.action, result.ruleResult)
      })
      .code(statusCodes.ok)
  }
}

/**
 * @import { LandParcelDb } from '~/src/features/parcel/parcel.d.js'
 */
