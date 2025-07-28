import Boom from '@hapi/boom'
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

      if (!landActions?.actions?.length === 0) {
        const errorMessage =
          'Error calculating payment land actions, no land or actions data provided'
        request.logger.error(errorMessage)
        return Boom.badRequest(errorMessage)
      }

      const calculateResponse = await calculatePayment(
        landActions,
        request.logger
      )

      if (!calculateResponse) {
        const errorMessage = 'Unable to calculate payment'
        request.logger.error(errorMessage)
        return Boom.badRequest(errorMessage)
      }

      return h
        .response({ message: 'success', ...calculateResponse })
        .code(statusCodes.ok)
    } catch (error) {
      const errorMessage = `Error calculating land actions payment: ${error.message}`
      request.logger.error(errorMessage, {
        error: error.message,
        stack: error.stack
      })
      return Boom.internal(errorMessage)
    }
  }
}

export { PaymentsCalculateController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
