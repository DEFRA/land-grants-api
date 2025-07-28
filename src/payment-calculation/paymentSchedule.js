import {
  addDays,
  addMonths,
  isSaturday,
  isWeekend,
  startOfMonth
} from 'date-fns'

import { calculatePaymentAmounts } from './paymentCalculation.js'

/**
 * Payment rules
 
-- assume the user has accepted the agreement today and the agreement start date is the 1st of the next month
-- The first quarterly payment date is always 3 calendar months + 5 days after the agreement start date
-- Subsequent payments are every 3 months on the 5th of the relevant month, see below: 
-- The start date of an Agreement is always on the 1st of the proceeding month, i.e. if accepted an offer say on the 4th August the agreement would have a start date on the 1st Sept
-- Quarterly payments would be on 5th Dec, then 5th March
-- If the ‘Due Date’ falls on a weekend, the payment will always occur the following Monday, and payments will never be made before the ‘Due Date’.
 */

/**
 * @typedef FrequencyConfig
 * @property {string} name
 * @property {number} frequencyInMonths
 * @property {number} totalPayments
 */

const frequencies = [
  {
    name: 'quarterly',
    frequencyInMonths: 3,
    years: 3
  }
]

const initialPaymentConfig = {
  months: 3,
  days: 4
}

/**
 *
 * @param {number} amountInPennies
 * @param {string=} frequency
 * @returns {{ agreementStartDate: Date, payments: object[] }} payment schedule
 */
export function calculatePaymentSchedule(
  amountInPennies,
  frequency = 'quarterly'
) {
  const frequencyConfig = frequencies.find((f) => f.name === frequency)
  if (!frequencyConfig) {
    throw Error(`Frequency config could not be found for: ${frequency}`)
  }

  const agreementStartDate = getAgreementStartDate()
  const paymentDates = getPaymentDates(agreementStartDate, frequencyConfig)
  // agreement end date is last payment date
  const agreementEndDate = paymentDates[paymentDates.length - 1].paymentDate
  const paymentAmounts = calculatePaymentAmounts(
    amountInPennies,
    frequencyConfig
  )

  const payments = paymentDates.map((d, i) => ({
    ...d,
    amountInPence: paymentAmounts[i]
  }))

  return {
    frequency,
    agreementStartDate,
    agreementEndDate,
    payments
  }
}

/**
 *
 * @returns the first of next month
 */
export function getAgreementStartDate() {
  return startOfMonth(addMonths(new Date(), 1))
}

/**
 * @param {Date} startDate agreement start date
 * @param {FrequencyConfig} frequencyConfig
 * @returns {{ paymentDate: Date }[]}
 */
export function getPaymentDates(startDate, frequencyConfig) {
  const { years, frequencyInMonths } = frequencyConfig
  const totalPayments = calculateTotalPayments(years, frequencyInMonths)
  const paymentDates = []

  // first payment date is start date plus 3 months and 5 days
  const firstPaymentDate = getFirstPaymentDate(startDate)
  paymentDates.push({ paymentDate: getClosestWorkingDay(firstPaymentDate) })
  // subsequent payments are plus 3 months or next monday if a weekend
  for (let i = 0; i < totalPayments - 1; i++) {
    const paymentDate = getClosestWorkingDay(
      addMonths(firstPaymentDate, (i + 1) * frequencyInMonths)
    )
    paymentDates.push({ paymentDate })
  }

  return paymentDates
}

/**
 *
 * @param {Date} startDate
 * @returns {Date} first payment date
 */
function getFirstPaymentDate(startDate) {
  const { days, months } = initialPaymentConfig
  return addDays(addMonths(startDate, months), days)
}

/**
 *
 * @param {Date} paymentDate
 * @returns same date or next working date (mon-fri)
 */
export function getClosestWorkingDay(paymentDate) {
  if (!isWeekend(paymentDate)) return paymentDate

  return addDays(paymentDate, isSaturday(paymentDate) ? 2 : 1)
}

function calculateTotalPayments(years, frequencyInMonths) {
  const months = 12 * years
  return months / frequencyInMonths
}
