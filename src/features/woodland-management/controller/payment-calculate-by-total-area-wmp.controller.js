import Boom from '@hapi/boom'
import { paymentCalculateTotalWMPSchema } from '../schema/payment-calculate-total-wmp.schema.js'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/features/common/schema/index.js'
import {
  logBusinessError,
  logInfo
} from '../../common/helpers/logging/log-helpers.js'
import { haToSqm } from '../../common/helpers/measurement.js'
import { calculateWMPPayment } from '../service/wmp-service.js'
import { wmpPaymentCalculateTransformer } from '../transformer/wmp-payment-calculate.transformer.js'
import { paymentCalculateWMPResponseSchema } from '../schema/payment-calculate-wmp.schema.js'
import {
  AuditEvent,
  auditEvent,
  getCorrelationId
} from '../../common/helpers/audit-event.js'

const handleWmpPaymentTotalCalculationError = async (request, error) => {
  /** @type {paymentCalculateTotalWMPSchema} */
  // @ts-expect-error - payload
  const { totalAreaHa, applicationId, sbi, crn } = request.payload

  logBusinessError(request.logger, {
    operation: 'Payment calculation: calculate total wmp payment',
    error,
    context: {
      totalAreaHa,
      applicationId,
      sbi,
      crn
    }
  })

  await auditEvent(
    AuditEvent.WMP_PAYMENT_TOTAL_CALCULATED,
    {
      ...buildAuditContext(request, sbi),
      request: { totalAreaHa, applicationId, sbi, crn },
      error: error.message
    },
    'failure',
    request
  )

  return Boom.internal('Error calculating wmp total payment')
}
/**
 * Builds the shared portion of a WMP payment calculation audit context.
 * @param {import('@hapi/hapi').Request} request
 * @param {string} sbi
 * @returns {object}
 */
const buildAuditContext = (request, sbi) => ({
  correlationId: getCorrelationId(request),
  sbi
})

/**
 *
 */
export const PaymentsCalculateTotalWMPController = {
  options: {
    tags: ['api'],
    description: 'Calculate WMP payment for total area',
    notes: 'Calculates payment amounts for WMP',
    validate: {
      payload: paymentCalculateTotalWMPSchema
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
    try {
      // @ts-expect-error - postgresDb
      const postgresDb = request.server.postgresDb
      const logger = request.logger

      /** @type {paymentCalculateTotalWMPSchema} */
      // @ts-expect-error - payload
      const { totalAreaHa, applicationId, sbi, crn } = request.payload

      logInfo(logger, {
        category: 'wmp',
        message: 'Payment Calculate total WMP',
        context: { totalAreaHa, applicationId, sbi, crn }
      })

      const { result: paymentResult, action } = await calculateWMPPayment(
        logger,
        postgresDb,
        { totalWoodlandAreaSqm: haToSqm(totalAreaHa) }
      )
      const transformedPaymentResult = wmpPaymentCalculateTransformer(
        [],
        paymentResult,
        action,
        undefined
      )

      await auditEvent(
        AuditEvent.WMP_PAYMENT_TOTAL_CALCULATED,
        {
          ...buildAuditContext(request, sbi),
          request: { totalAreaHa, applicationId, sbi, crn },
          response: transformedPaymentResult
        },
        'success',
        request
      )

      return h.response({
        message: 'success',
        payment: transformedPaymentResult
      })
    } catch (error) {
      return handleWmpPaymentTotalCalculationError(request, error)
    }
  }
}

/**
 * @import { Request, ResponseToolkit, ResponseObject } from '@hapi/hapi'
 */
