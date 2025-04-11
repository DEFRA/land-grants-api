import Boom from '@hapi/boom'

/**
 * validates land actions data and return isValidationSucess flag
 * @returns {object} isValidationSucess boolean flag
 * @param {object} landActions - The parcel to fetch
 * @param {object} logger - Logger instance
 */
function validateLandActions(landActions, logger) {
  const firstLandAction =
    Array.isArray(landActions) && landActions.length > 0
      ? landActions[0]
      : landActions
  if (
    !firstLandAction ||
    !Array.isArray(landActions) ||
    landActions.length === 0
  ) {
    logger.error(
      `Error validating land actions, no land and actions data provided`
    )
    throw Boom.badRequest('landActions are required')
  }

  const errorMessages =
    landActions.length > 0 &&
    landActions[0].actions.length > 0 &&
    landActions[0].actions.reduce((errors, item) => {
      if (item.quantity > 100) {
        errors.push(`${item.code} is exceeding max limit 100`)
      }
      return errors
    }, [])

  return {
    errorMessages,
    valid: errorMessages.length === 0
  }
}

/**
 * calculate payment amount for given land actions data
 * @returns {object} The land actions payment amount
 * @param {object} landActions - The parcel to fetch
 * @param {object} logger - Logger instance
 */
function calculatePayment(landActions, logger) {
  if (!landActions) {
    logger.error(
      `Error calculating payment land actions, no land and actions data provided`
    )
    throw Boom.badRequest('landActions are required')
  }

  return {
    payment: {
      total: 100.98
    }
  }
}

export { validateLandActions, calculatePayment }
