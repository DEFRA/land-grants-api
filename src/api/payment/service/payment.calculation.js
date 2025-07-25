import actions from "~/src/api/common/helpers/seed-data/action-data.js"


/**
 *
 * @param {number} amountInPence
 * @param {FrequencyConfig} frequencyConfig
 * @returns {number[]} payment amounts
 */
export function calculatePaymentAmounts(amountInPence, frequencyConfig) {
  const { totalPayments } = frequencyConfig

  const remainder = amountInPence % totalPayments
  const paymentAmount = (amountInPence - remainder) / totalPayments

  return new Array(totalPayments).fill(0).map((_, i) => {
    // add the remainder to the first payment
    if (i === 0) return paymentAmount + remainder

    return paymentAmount
  })
}

/**
 * 
 * @param {Action} action 
 * @returns {number} action amount in pennies
 */
export function calculateActionPayment(action) {
  const {code, quantity} = action

  const actionData = actions.find(a => a.code === code)
  if (!actionData) {
    throw Error(`No action data found for code: ${code}`)
  }

  const {payment: {ratePerAgreementPerYearGbp, ratePerUnitGbp}} = actionData

  const ratePerAgreementPerYearGbpPennies = Math.round(ratePerAgreementPerYearGbp * 100);
  const ratePerUnitGbpPennies = Math.round(ratePerUnitGbp * 100);

  return (ratePerAgreementPerYearGbpPennies || 0) + (ratePerUnitGbpPennies * quantity)
}


/**
 * @import { Action } from '../payment.d.js'
 */
