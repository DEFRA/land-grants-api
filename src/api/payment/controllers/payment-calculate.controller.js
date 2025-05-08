import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import { calculatePayment } from '~/src/api/payment/service/payment.service.js'
import { landActionSchema } from '~/src/api/actions/schema/action-validation.schema.js'
import { PaymentCalculateResponseSchema } from '~/src/api/payment/schema/payment-calculate.schema.js'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/api/common/schema/index.js'

/**
 * LandActionsPaymentController
 * Finds all entries in a mongodb collection
 * @satisfies {Partial<ServerRoute>}
 */
const PaymentsCalculateController = {
  options: {
    tags: ['api'],
    description: 'Calculate land actions payment',
    notes:
      'Calculates payment amounts for land-based actions. Used to determine annual payments based on action type and land area.',
    validate: {
      payload: landActionSchema
    },
    response: {
      status: {
        200: PaymentCalculateResponseSchema,
        404: errorResponseSchema,
        500: internalServerErrorResponseSchema
      }
    }
  },

  handler: async (request, h) => {
    try {
      const { landActions } = request.payload

      request.logger.info(
        `Controller calculating land actions payment ${landActions}`
      )
      const calculateResponse = await calculatePayment(
        landActions,
        request.logger
      )

      return h
        .response({ message: 'success', ...calculateResponse })
        .code(statusCodes.ok)
    } catch (error) {
      request.logger.error(
        `Error calculating land actions payment: ${error.message}`
      )
      return h
        .response({
          message: error.message
        })
        .code(statusCodes.notFound)
    }
  }
}

export { PaymentsCalculateController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
