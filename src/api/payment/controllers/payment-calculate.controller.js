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
 * Validate land actions are provided
 * @param {import('@hapi/hapi').Request} request
 * @param {LandAction[]} landActions
 * @returns {import('@hapi/boom').Boom | null}
 */
const validateLandActionsPresent = (request, landActions) => {
  if (landActions.length === 0) {
    logValidationWarn(request.logger, {
      operation: 'Payment calculation request',
      errors: 'No land or actions data provided'
    })
    return Boom.badRequest(
      'Error calculating payment land actions, no land or actions data provided'
    )
  }
  return null
}

/**
 * Validate request data against enabled actions
 * @param {import('@hapi/hapi').Request} request
 * @param {LandAction[]} landActions
 * @param {Action[]} enabledActions
 * @returns {Promise<import('@hapi/boom').Boom | null>}
 */
const validateRequestData = async (request, landActions, enabledActions) => {
  const validationErrors = await validateRequest(
    landActions,
    enabledActions,
    request
  )

  if (validationErrors && validationErrors.length > 0) {
    logValidationWarn(request.logger, {
      operation: 'Payment calculation error',
      errors: validationErrors
    })
    return Boom.badRequest(validationErrors.join(', '))
  }

  return null
}

/**
 * Determine action duration from enabled actions
 * @param {import('@hapi/hapi').Request} request
 * @param {LandAction[]} landActions
 * @param {Action[]} enabledActions
 * @returns {number | import('@hapi/boom').Boom}
 */
const getTotalDurationInYears = (request, landActions, enabledActions) => {
  const landActionCodes = landActions.flatMap((landAction) =>
    landAction.actions.map((a) => a.code)
  )

  let totalDurationYears = 0
  for (const enabledAction of enabledActions) {
    if (
      landActionCodes.includes(enabledAction.code) &&
      enabledAction.durationYears > totalDurationYears
    ) {
      totalDurationYears = enabledAction.durationYears
    }
  }

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

  return totalDurationYears
}

/**
 * Calculate payment for land parcels
 * @param {import('@hapi/hapi').Request} request
 * @param {LandAction[]} landActions
 * @param {Action[]} enabledActions
 * @param {number} totalDurationYears
 * @param {Date | undefined} startDate
 * @returns {object | import('@hapi/boom').Boom}
 */
const calculatePayment = (
  request,
  landActions,
  enabledActions,
  totalDurationYears,
  startDate
) => {
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

  return calculateResponse
}

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
      const { landActions, startDate } = request.payload

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
      const { landActions, startDate } = request.payload
      logBusinessError(request.logger, {
        operation: 'Payment calculation: calculate land actions payment',
        error,
        context: {
          landActionsCount: landActions?.length ?? 0,
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
 * @import { Action } from '../../actions/action.d.js'
 * @import { LandAction, PaymentCalculateRequestPayload } from '../payment.d.js'
 */
