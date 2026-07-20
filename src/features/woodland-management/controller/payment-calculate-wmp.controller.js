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
  logValidationWarn,
  logBusinessError
} from '~/src/features/common/helpers/logging/log-helpers.js'
import { statusCodes } from '~/src/features/common/constants/status-codes.js'
import { wmpPaymentCalculateTransformer } from '../transformer/wmp-payment-calculate.transformer.js'
import { executePaymentMethod } from '../../payments-engine/paymentsEngine.js'
import { validatePaymentCalculationRequest } from '../validation/payment-calculation.validation.js'
import { getActionsByLatestVersion } from '../../actions/queries/2.0.0/getActionsByLatestVersion.query.js'
import { haToSqm } from '../../common/helpers/measurement.js'
import {
  AuditEvent,
  auditEvent,
  getCorrelationId
} from '../../common/helpers/audit-event.js'

/**
 * Builds the shared portion of a WMP payment calculation audit context.
 * @param {import('@hapi/hapi').Request} request
 * @param {object} params
 * @param {string[]} params.parcelIds
 * @returns {object}
 */
const buildAuditContext = (request, { parcelIds }) => ({
  correlationId: getCorrelationId(request),
  parcelIds
})

/**
 * Runs the WMP payment calculation pipeline for a validated request.
 * @param {import('@hapi/hapi').Request} request
 * @param {object} postgresDb
 * @param {object} params
 * @param {string[]} params.parcelIds
 * @param {number} params.oldWoodlandAreaHa
 * @param {number} params.newWoodlandAreaHa
 * @param {Date} [params.startDate]
 * @returns {Promise<object | import('@hapi/boom').Boom>} Transformed payment response, or a Boom error response
 */
const runWmpPaymentCalculation = async (
  request,
  postgresDb,
  { parcelIds, oldWoodlandAreaHa, newWoodlandAreaHa, startDate }
) => {
  const validationResponse = await validatePaymentCalculationRequest(
    parcelIds,
    request
  )

  if (validationResponse.errors && validationResponse.errors.length > 0) {
    logValidationWarn(request.logger, {
      operation: 'Payment Calculate WMP validation',
      errors: validationResponse.errors,
      context: { parcelIds: parcelIds.join(',') }
    })
    return Boom.badRequest(validationResponse.errors.join(', '))
  }

  const actions = await getActionsByLatestVersion(request.logger, postgresDb)
  const action = actions.find((a) => a.code === 'PA3')

  if (!action) {
    return Boom.badRequest('Action not found')
  }

  const paymentResult = executePaymentMethod(
    { ...action?.paymentMethod },
    {
      data: {
        oldWoodlandAreaSqm: haToSqm(oldWoodlandAreaHa),
        newWoodlandAreaSqm: haToSqm(newWoodlandAreaHa)
      }
    }
  )

  return wmpPaymentCalculateTransformer(
    parcelIds,
    paymentResult,
    action,
    startDate
  )
}

/**
 * Handles unexpected errors thrown during WMP payment calculation: logs the
 * error, publishes a failure audit event, and returns the client-facing
 * error response.
 * @param {import('@hapi/hapi').Request} request
 * @param {Error} error
 * @returns {Promise<import('@hapi/boom').Boom>}
 */
const handleWmpPaymentCalculationError = async (request, error) => {
  /** @type {paymentCalculateWMPSchemaV2} */
  // @ts-expect-error - payload
  const { parcelIds, oldWoodlandAreaHa, newWoodlandAreaHa, startDate } =
    request.payload
  logBusinessError(request.logger, {
    operation: 'Payment calculation: calculate wmp payment',
    error,
    context: {
      parcelIds: parcelIds.join(','),
      oldWoodlandAreaHa,
      newWoodlandAreaHa,
      startDate
    }
  })

  await auditEvent(
    AuditEvent.WMP_PAYMENT_CALCULATED,
    {
      ...buildAuditContext(request, { parcelIds }),
      request: { oldWoodlandAreaHa, newWoodlandAreaHa, startDate },
      error: error.message
    },
    'failure',
    request
  )

  return Boom.internal('Error calculating wmp payment')
}

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
    try {
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

      const transformedPayment = await runWmpPaymentCalculation(
        request,
        postgresDb,
        { parcelIds, oldWoodlandAreaHa, newWoodlandAreaHa, startDate }
      )
      if (Boom.isBoom(transformedPayment)) {
        return transformedPayment
      }

      await auditEvent(
        AuditEvent.WMP_PAYMENT_CALCULATED,
        {
          ...buildAuditContext(request, { parcelIds }),
          request: { oldWoodlandAreaHa, newWoodlandAreaHa, startDate },
          response: transformedPayment
        },
        'success',
        request
      )

      return h
        .response({
          message: 'success',
          payment: transformedPayment
        })
        .code(statusCodes.ok)
    } catch (error) {
      return handleWmpPaymentCalculationError(request, error)
    }
  }
}

/**
 * @import { Request, ResponseToolkit, ResponseObject } from '@hapi/hapi'
 */
