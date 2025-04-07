import Boom from '@hapi/boom'

/**
 * validates land actions data and return isValidationSucess flag
 * @returns {object} isValidationSucess boolean flag
 * @param {object} landActions - The parcel to fetch
 * @param {object} logger - Logger instance
 */
function validateLandActions(landActions, logger) {
  if (!landActions) {
    logger.error(
      `Error validating land actions, no land and actions data provided`
    )
    throw Boom.badRequest('landActions is required')
  }
  if (landActions.sbi === 'SB32445') {
    return {
      errorMessages: ['Actions not applicable', 'Max 3 ponds applicable'],
      valid: false
    }
  }

  return {
    errorMessages: [],
    valid: true
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
    throw Boom.badRequest('landActions is required')
  }

  return {
    sbi: landActions.sbi,
    payment: {
      total: 100.98
    }
  }
}

export { validateLandActions, calculatePayment }
