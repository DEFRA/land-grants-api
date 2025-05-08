import Boom from '@hapi/boom'

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

export { calculatePayment }
