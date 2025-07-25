import { calculateActionPayment } from "./payment.calculation.js"
/**
 * calculate payment amount for given land actions data
 * @returns {object} The land actions payment amount
 * @param {LandAction[]} landActions - The land actions
 * @param {object} logger - Logger instance
 */
function calculatePayment(landActions, logger) {
  // get actions date for each action
  
  const actionTotals = landActions.actions.map(calculateActionPayment)

  return {
  
  }
}

export { calculatePayment }


/**
 * @import { LandAction } from '../payment.d.js'
 */
