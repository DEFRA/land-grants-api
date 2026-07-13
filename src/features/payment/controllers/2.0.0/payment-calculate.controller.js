import Boom from '@hapi/boom'
import { statusCodes } from '~/src/features/common/constants/status-codes.js'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/features/common/schema/index.js'
import {
  PaymentCalculateResponseSchemaV2,
  PaymentCalculateSchema
} from '~/src/features/payment/schema/2.0.0/payment-calculate.schema.js'
import { quantityValidationFailAction } from '~/src/features/common/helpers/joi-validations.js'
import {
  logBusinessError,
  logInfo
} from '~/src/features/common/helpers/logging/log-helpers.js'
import {
  calculatePayment,
  getTotalDurationInYears,
  validateLandActionsPresent,
  validateRequestData
} from '~/src/features/payment/services/payment.service.js'
import { paymentCalculationTransformerV2 } from '~/src/features/payment/transformers/2.0.0/payment.transformer.js'
import { getActions } from '~/src/features/actions/service/action.service.js'
import {
  AuditEvent,
  auditEvent
} from '~/src/features/common/helpers/audit-event.js'
import { config } from '~/src/config/index.js'

/**
 * Resolves the correlation id to record on audit events from the tracing header.
 * @param {import('@hapi/hapi').Request} request
 * @returns {string|string[]|undefined}
 */
const getCorrelationId = (request) =>
  request.headers?.[config.get('tracing.header')]

/**
 * Builds the shared portion of a payment calculation audit context.
 * @param {import('@hapi/hapi').Request} request
 * @param {object} params
 * @param {string} params.applicationId
 * @param {string} params.sbi
 * @returns {object}
 */
const buildAuditContext = (request, { applicationId, sbi }) => ({
  correlationId: getCorrelationId(request),
  applicationId,
  identifiers: { sbi }
})

/**
 * Runs the payment calculation pipeline for a validated request.
 * @param {import('@hapi/hapi').Request} request - Hapi request object
 * @param {object} postgresDb - Postgres connection
 * @param {object} params
 * @param {import('../../payment.d.js').LandAction[]} params.landActions
 * @param {Date} [params.startDate]
 * @param {string} params.applicationId
 * @returns {Promise<object | import('@hapi/boom').Boom>} Transformed payment response, or a Boom error response
 */
const runPaymentCalculation = async (
  request,
  postgresDb,
  { landActions, startDate, applicationId }
) => {
  const landActionsValidation = validateLandActionsPresent(request, landActions)
  if (landActionsValidation) {
    return landActionsValidation
  }

  const enabledActions = await getActions(
    request,
    postgresDb,
    landActions,
    applicationId
  )

  const requestValidation = await validateRequestData(
    request,
    landActions,
    enabledActions
  )
  if (requestValidation) {
    return requestValidation
  }

  const totalDurationYears = getTotalDurationInYears(
    request,
    landActions,
    enabledActions
  )
  if (Boom.isBoom(totalDurationYears)) {
    return totalDurationYears
  }

  const calculateResponse = calculatePayment(
    request,
    landActions,
    enabledActions,
    totalDurationYears,
    startDate
  )
  if (Boom.isBoom(calculateResponse)) {
    return calculateResponse
  }

  return paymentCalculationTransformerV2(calculateResponse)
}

/**
 * Handles unexpected errors thrown during payment calculation: logs the
 * error, publishes a failure audit event, and returns the client-facing
 * error response.
 * @param {import('@hapi/hapi').Request} request
 * @param {Error} error
 * @returns {Promise<import('@hapi/boom').Boom>}
 */
const handleCalculationError = async (request, error) => {
  /** @type {PaymentCalculateRequestPayload} */
  // @ts-expect-error - payload
  const { parcel, startDate, applicationId } = request.payload
  // @ts-expect-error - payload
  const { sbi } = request.payload

  logBusinessError(request.logger, {
    operation: 'Payment calculation: calculate land actions payment',
    error,
    context: {
      landActionsCount: parcel?.length ?? 0,
      startDate
    }
  })

  await auditEvent(
    AuditEvent.PAYMENT_CALCULATED,
    {
      ...buildAuditContext(request, { applicationId, sbi }),
      request: { parcel, startDate },
      error: error.message
    },
    'failure',
    request
  )

  return Boom.internal('Error calculating land actions payment')
}

/**
 * PaymentsCalculateController
 * @satisfies {Partial<ServerRoute>}
 */
const PaymentsCalculateControllerV2 = {
  options: {
    tags: ['api'],
    description: 'Calculate land actions payment',
    notes:
      'Calculates payment amounts for land-based actions. Used to determine annual payments based on action type and land area.',
    validate: {
      payload: PaymentCalculateSchema,
      failAction: quantityValidationFailAction
    },
    response: {
      status: {
        200: PaymentCalculateResponseSchemaV2,
        404: errorResponseSchema,
        500: internalServerErrorResponseSchema
      }
    }
  },

  /**
   * Handler function for payment calculation
   * @param {import('@hapi/hapi').Request} request - Hapi request object
   * @param {import('@hapi/hapi').ResponseToolkit} h - Hapi response toolkit
   * @returns {Promise<import('@hapi/hapi').ResponseObject | import('@hapi/boom').Boom>} Payment calculation response
   */
  handler: async (request, h) => {
    try {
      // @ts-expect-error - postgresDb
      const postgresDb = request.server.postgresDb

      /** @type {PaymentCalculateRequestPayload} */
      // @ts-expect-error - payload
      const { parcel: landActions, startDate, applicationId } = request.payload
      // @ts-expect-error - payload
      const { sbi } = request.payload

      logInfo(request.logger, {
        category: 'payment',
        message: 'Calculating payment'
      })

      const calculationResult = await runPaymentCalculation(
        request,
        postgresDb,
        { landActions, startDate, applicationId }
      )
      if (Boom.isBoom(calculationResult)) {
        return calculationResult
      }
      const transformedResponse = calculationResult

      logInfo(request.logger, {
        category: 'payment',
        message: 'Payment calculation success',
        context: {
          annualTotalPence: transformedResponse.annualTotalPence,
          agreementTotalPence: transformedResponse.agreementTotalPence
        }
      })

      await auditEvent(
        AuditEvent.PAYMENT_CALCULATED,
        {
          ...buildAuditContext(request, { applicationId, sbi }),
          request: { parcel: landActions, startDate },
          response: transformedResponse
        },
        'success',
        request
      )

      return h
        .response({ message: 'success', payment: transformedResponse })
        .code(statusCodes.ok)
    } catch (error) {
      return handleCalculationError(request, error)
    }
  }
}

export { PaymentsCalculateControllerV2 }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 * @import { PaymentCalculateRequestPayload } from '../../payment.d.js'
 */
