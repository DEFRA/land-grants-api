import Boom from '@hapi/boom'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/features/common/schema/index.js'
import {
  paymentCalculateWMPSchemaV2,
  paymentCalculateWMPResponseSchema
} from '../schema/payment-calculate-wmp.schema.js'
import {
  logInfo,
  logValidationWarn
} from '~/src/features/common/helpers/logging/log-helpers.js'
import { statusCodes } from '~/src/features/common/constants/status-codes.js'
import { wmpPaymentCalculateTransformer } from '../transformer/wmp-payment-calculate.transformer.js'
import { executePaymentMethod } from '../../payments-engine/paymentsEngine.js'
import { validatePaymentCalculationRequest } from '../validation/payment-calculation.validation.js'
import { getActionsByLatestVersion } from '../../actions/queries/2.0.0/getActionsByLatestVersion.query.js'
import { sumTotalLandAreaSqm } from '../service/wmp-payment-calculate.service.js'

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
        200: paymentCalculateWMPResponseSchema,
        404: errorResponseSchema,
        500: internalServerErrorResponseSchema
      }
    }
  },

  /**
   * Handler function for payment calculation
   * @param {Request} request - Hapi request object
   * @param {ResponseToolkit} h - Hapi response toolkit
   * @returns {Promise<ResponseObject | import('@hapi/boom').Boom>} Payment calculation response
   */
  handler: async (request, h) => {
    // @ts-expect-error - postgresDb
    const postgresDb = request.server.postgresDb

    /** @type {paymentCalculateWMPSchemaV2} */
    // @ts-expect-error - payload
    const { parcelIds, oldWoodlandAreaHa, newWoodlandAreaHa, startDate } =
      request.payload

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

    const validationResponse = await validatePaymentCalculationRequest(
      parcelIds,
      request
    )

    if (validationResponse.errors && validationResponse.errors.length > 0) {
      logValidationWarn(request.logger, {
        operation: 'Payment Calculate WMP validation',
        errors: validationResponse.errors,
        context: {
          parcelIds: parcelIds.join(',')
        }
      })
      return Boom.badRequest(validationResponse.errors.join(', '))
    }

    const actions = await getActionsByLatestVersion(request.logger, postgresDb)
    const action = actions.find((a) => a.code === 'PA3')

    if (!action) {
      return Boom.badRequest('Action not found')
    }

    const totalParcelAreaSqm = sumTotalLandAreaSqm(validationResponse.parcels)

    const paymentResult = executePaymentMethod(
      { ...action?.paymentMethod },
      {
        data: {
          totalParcelArea: totalParcelAreaSqm,
          oldWoodlandAreaHa,
          newWoodlandAreaHa,
          startDate
        }
      }
    )

    return h
      .response({
        message: 'success',
        payment: wmpPaymentCalculateTransformer(
          parcelIds,
          paymentResult,
          action,
          startDate
        )
      })
      .code(statusCodes.ok)
  }
}

/**
 * @import { Request, ResponseToolkit, ResponseObject } from '@hapi/hapi'
 */
