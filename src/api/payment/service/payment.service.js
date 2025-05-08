/**
 * calculate payment amount for given land actions data
 * @returns {object} The land actions payment amount
 * @param {object} landActions - The land actions
 * @param {object} logger - Logger instance
 */
function calculatePayment(landActions, logger) {
  // mock error condition, replace with actual error condition
  if (
    !landActions ||
    landActions?.length === 0 ||
    landActions[0]?.sheetId === ''
  ) {
    logger.error('Unable to calculate payment')
    return null
  }

  return {
    payment: {
      total: 100.98
    }
  }
}

export { calculatePayment }
