import Boom from '@hapi/boom'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/features/common/schema/index.js'
import {
  paymentCalculateWMPSchemaV2,
  paymentCalculateWMPResponseSchemaV2
} from '../schema/payment-calculate-wmp.schema.js'
import {
  logInfo,
  logValidationWarn
} from '~/src/features/common/helpers/logging/log-helpers.js'
import { statusCodes } from '~/src/features/common/constants/status-codes.js'
import { wmpPaymentCalculateTransformer } from '../transformer/wmp-payment-calculate.transformer.js'
import { executePaymentMethod } from '../../payments-engine/paymentsEngine.js'
import { validatePaymentCalculationRequest } from '../validation/payment-calculation.validation.js'
import { getEnabledActions } from '../../actions/queries/getEnabledActions.query.js'
import { executeRulesForPaymentCalculationWMP } from '../service/wmp-payment-calculate.service.js'

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
    // @ts-expect-error - postgresDb
    const postgresDb = request.server.postgresDb

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

    // move this to the service
    const actions = await getEnabledActions(request.logger, postgresDb)
    const action = actions.find((a) => a.code === 'PA3')

    if (!action) {
      return Boom.badRequest('Action not found')
    }

    const { ruleResult, totalParcelArea } =
      executeRulesForPaymentCalculationWMP(
        validationResponse.parcels,
        action,
        oldWoodlandAreaHa,
        newWoodlandAreaHa
      )

    const paymentResult = executePaymentMethod(
      { ...action?.paymentMethod, version: '1.0.0' }, // add version to config
      {
        data: {
          totalParcelArea,
          oldWoodlandAreaHa,
          newWoodlandAreaHa,
          startDate
        }
      }
    )

    console.log('totalParcelArea', totalParcelArea)
    console.log('ruleResult', ruleResult)
    console.log('paymentResult', paymentResult)

    return h
      .response({
        message: 'success',
        result: wmpPaymentCalculateTransformer(
          paymentResult,
          totalParcelArea,
          action,
          startDate
        )
      })
      .code(statusCodes.ok)
  }
}

/**
 * @import { LandParcelDb } from '~/src/features/parcel/parcel.d.js'
 */
