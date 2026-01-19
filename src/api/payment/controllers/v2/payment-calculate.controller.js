import Boom from '@hapi/boom'
import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/api/common/schema/index.js'
import { paymentCalculateSchema } from '~/src/api/payment/schema/payment-calculate.schema.js'
import { PaymentCalculateResponseSchemaV2 } from '~/src/api/payment/schema/v2/payment-calculate.schema.js'
import { getPaymentCalculationDataRequirements } from '~/src/payment-calculation/paymentCalculation.js'
import { quantityValidationFailAction } from '~/src/api/common/helpers/joi-validations.js'
import {
  logBusinessError,
  logInfo
} from '~/src/api/common/helpers/logging/log-helpers.js'
import {
  validateLandActionsPresent,
  validateRequestData,
  getTotalDurationInYears,
  calculatePayment
} from '~/src/api/payment/services/payment.service.js'

/**
 * PaymentsCalculateController
 * @satisfies {Partial<ServerRoute>}
 */
const PaymentsCalculateControllerV2 = {
  options: {
    tags: ['api/v2'],
    description: 'Calculate land actions payment',
    notes:
      'Calculates payment amounts for land-based actions. Used to determine annual payments based on action type and land area.',
    validate: {
      payload: paymentCalculateSchema,
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
      const { parcel: landActions, startDate } = request.payload

      logInfo(request.logger, {
        category: 'payment',
        message: 'Calculating payment',
        context: {
          landActionsCount: landActions.length
        }
      })

      // Validate land actions are present
      const landActionsValidation = validateLandActionsPresent(
        request,
        landActions
      )
      if (landActionsValidation) {
        return landActionsValidation
      }

      // Get enabled actions from database
      const { enabledActions } = await getPaymentCalculationDataRequirements(
        postgresDb,
        request.logger
      )

      // Validate request data
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

      logInfo(request.logger, {
        category: 'payment',
        message: 'Payment calculation success',
        context: {
          annualTotalPence: calculateResponse.annualTotalPence,
          agreementTotalPence: calculateResponse.agreementTotalPence
        }
      })

      return h
        .response({ message: 'success', payment: calculateResponse })
        .code(statusCodes.ok)
    } catch (error) {
      /** @type {PaymentCalculateRequestPayload} */
      // @ts-expect-error - payload
      const { parcel, startDate } = request.payload
      logBusinessError(request.logger, {
        operation: 'Payment calculation: calculate land actions payment',
        error,
        context: {
          landActionsCount: parcel?.length ?? 0,
          startDate
        }
      })
      return Boom.internal('Error calculating land actions payment')
    }
  }
}

export { PaymentsCalculateControllerV2 }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 * @import { PaymentCalculateRequestPayload } from '../../payment.d.js'
 */
