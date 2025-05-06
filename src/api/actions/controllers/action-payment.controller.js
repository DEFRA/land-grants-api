import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import { calculatePayment } from '~/src/api/actions/service/land-actions.service.js'

/**
 * LandActionsPaymentController
 * Finds all entries in a mongodb collection
 * @satisfies {Partial<ServerRoute>}
 */
const LandActionsPaymentController = {
  options: {
    tags: ['api'],
    description: 'Calculate land actions payment',
    notes:
      'Calculates payment amounts for land-based actions. Used to determine annual payments based on action type and land area.'
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

export { LandActionsPaymentController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
