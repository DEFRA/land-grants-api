import Boom from '@hapi/boom'
import { statusCodes } from '~/src/api/common/constants/status-codes.js'
import {
  errorResponseSchema,
  internalServerErrorResponseSchema
} from '~/src/api/common/schema/index.js'
import {
  PaymentCalculateResponseSchema,
  paymentCalculateSchema
} from '~/src/api/payment/schema/payment-calculate.schema.js'
import {
  getPaymentCalculationDataRequirements,
  getPaymentCalculationForParcels
} from '~/src/payment-calculation/paymentCalculation.js'

/**
 * PaymentsCalculateController
 * @satisfies {Partial<ServerRoute>}
 */
const PaymentsCalculateController = {
  options: {
    tags: ['api'],
    description: 'Calculate land actions payment',
    notes:
      'Calculates payment amounts for land-based actions. Used to determine annual payments based on action type and land area.',
    validate: {
      payload: paymentCalculateSchema
    },
    response: {
      status: {
        200: PaymentCalculateResponseSchema,
        404: errorResponseSchema,
        500: internalServerErrorResponseSchema
      }
    }
  },

  /**
   * Handler function for application validation
   * @param {import('@hapi/hapi').Request} request - Hapi request object
   * @param {import('@hapi/hapi').ResponseToolkit} h - Hapi response toolkit
   * @returns {Promise<import('@hapi/hapi').ResponseObject | import('@hapi/boom').Boom>} Validation response
   */
  handler: async (request, h) => {
    try {
      // @ts-expect-error - postgresDb is added via server decoration
      const postgresDb = request.server.postgresDb
      // @ts-expect-error - payload is added via server decoration
      const { landActions, startDate } = request.payload

      request.logger.info(
        `Controller calculating land actions payment ${landActions}`
      )

      if (landActions.length === 0) {
        const errorMessage =
          'Error calculating payment land actions, no land or actions data provided'
        request.logger.error(errorMessage)
        return Boom.badRequest(errorMessage)
      }

      const { enabledActions } = await getPaymentCalculationDataRequirements(
        postgresDb,
        request.logger
      )

      // for day 1, we assume duration years is 3 because all actions are 3 years long
      // but this will change and our payment algorithm will have to support having actions with different lengths!
      let totalDurationYears = 0
      const landActionCodes = landActions.flatMap((landAction) =>
        landAction.actions.map((a) => a.code)
      )
      enabledActions.forEach((enabledAction) => {
        if (
          landActionCodes.includes(enabledAction.code) &&
          enabledAction.durationYears > totalDurationYears
        ) {
          totalDurationYears = enabledAction.durationYears
        }
      })

      if (totalDurationYears === 0) {
        const errorMessage = 'Error getting actions information'
        request.logger.error(errorMessage)
        return Boom.badRequest(errorMessage)
      }

      const calculateResponse = getPaymentCalculationForParcels(
        landActions,
        enabledActions,
        totalDurationYears,
        startDate
      )

      if (!calculateResponse) {
        const errorMessage = 'Unable to calculate payment'
        request.logger.error(errorMessage)
        return Boom.badRequest(errorMessage)
      }

      return h
        .response({ message: 'success', payment: calculateResponse })
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
