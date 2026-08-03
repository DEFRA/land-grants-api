import Boom from '@hapi/boom'
import { getPaymentCalculationForParcels } from '~/src/features/payment-calculation/paymentCalculation.js'
import { validateRequest } from '~/src/features/application/validation/application.validation.js'
import {
  logValidationWarn,
  logBusinessError
} from '~/src/features/common/helpers/logging/log-helpers.js'

/**
 * @import { Action } from '../../actions/action.d.js'
 * @import { LandAction } from '../payment.d.js'
 */

/**
 * Validate land actions are provided
 * @param {import('@hapi/hapi').Request} request
 * @param {LandAction[]} landActions
 * @returns {import('@hapi/boom').Boom | null}
 */
export const validateLandActionsPresent = (request, landActions) => {
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
export const validateRequestData = async (
  request,
  landActions,
  enabledActions
) => {
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
export const getTotalDurationInYears = (
  request,
  landActions,
  enabledActions
) => {
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
export const calculatePayment = (
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
