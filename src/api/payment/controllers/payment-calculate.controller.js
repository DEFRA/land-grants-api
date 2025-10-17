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
import { quantityValidationFailAction } from '~/src/api/common/helpers/joi-validations.js'
import { validateRequest } from '~/src/api/application/validation/application.validation.js'
import {
  logValidationWarn,
  logBusinessError,
  logInfo
} from '~/src/api/common/helpers/logging/log-helpers.js'

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
      payload: paymentCalculateSchema,
      failAction: quantityValidationFailAction
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
      // @ts-expect-error - postgresDb
      const postgresDb = request.server.postgresDb
      // @ts-expect-error - payload
      const { landActions, startDate } = request.payload

      logInfo(request.logger, {
        category: 'payment',
        message: 'Controller calculating land actions payment',
        context: {
          landActions: JSON.stringify(landActions)
        }
      })

      if (landActions.length === 0) {
        logValidationWarn(request.logger, {
          operation: 'Payment calculation request',
          errors: 'No land or actions data provided'
        })
        return Boom.badRequest(
          'Error calculating payment land actions, no land or actions data provided'
        )
      }

      const { enabledActions } = await getPaymentCalculationDataRequirements(
        postgresDb,
        request.logger
      )

      // Validate the entire request
      const validationErrors = await validateRequest(
        landActions,
        enabledActions,
        request
      )

      // If there are validation errors, return a bad request response
      if (validationErrors && validationErrors.length > 0) {
        logValidationWarn(request.logger, {
          operation: 'Payment calculation request',
          errors: 'No land or actions data provided'
        })
        return Boom.badRequest(validationErrors.join(', '))
      }

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
        logBusinessError(request.logger, {
          operation: 'Payment calculation: determine action duration',
          error: new Error('No valid duration found for requested actions'),
          context: {
            landActionCodes: landActionCodes.join(',')
          }
        })
        return Boom.badRequest('Error getting actions information')
      }

      const calculateResponse = getPaymentCalculationForParcels(
        landActions,
        enabledActions,
        totalDurationYears,
        startDate
      )

      if (!calculateResponse) {
        logBusinessError(request.logger, {
          operation: 'Payment calculation: calculate payment',
          error: new Error('Payment calculation returned null/undefined'),
          context: {
            landActionsCount: landActions.length,
            totalDurationYears,
            startDate
          }
        })
        return Boom.badRequest('Unable to calculate payment')
      }

      return h
        .response({ message: 'success', payment: calculateResponse })
        .code(statusCodes.ok)
    } catch (error) {
      // @ts-expect-error - payload
      const { landActions, startDate } = request.payload
      logBusinessError(request.logger, {
        operation: 'Payment calculation: calculate land actions payment',
        error,
        context: {
          landActionsCount: landActions.length,
          startDate
        }
      })
      return Boom.internal('Error calculating land actions payment')
    }
  }
}

export { PaymentsCalculateController }

/**
 * @import { ServerRoute } from '@hapi/hapi'
 */
