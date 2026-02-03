import {
  addDays,
  addMonths,
  addYears,
  endOfMonth,
  format,
  isBefore,
  isWeekend,
  setDate,
  startOfMonth,
  subDays
} from 'date-fns'

const PAYMENT_DAY_OF_MONTH = 5
export const SCHEDULE_DATE_FORMAT = 'yyyy-MM-dd'

/**
 * Get the payment date of the month set by date, adjusted for weekends
 * @param {Date} date
 * @returns {Date} the PAYMENT_DAY_OF_MONTH of the month (or adjusted if weekend)
 */
function getPaymentDayForDate(date) {
  const fifthOfMonth = setDate(date, PAYMENT_DAY_OF_MONTH)

  if (!isWeekend(fifthOfMonth)) {
    return fifthOfMonth
  }

  let newDate = fifthOfMonth
  while (isWeekend(newDate)) {
    newDate = addDays(newDate, 1)
  }

  return newDate
}

/**
 *
 * @returns the first of next month
 */
export function getFirstDayOfNextMonth(startDate) {
  return format(startOfMonth(addMonths(startDate, 1)), SCHEDULE_DATE_FORMAT)
}

/**
 *
 * @returns the end date of an agreement
 */
export function getAgreementEndDate(startDate, agreementYears) {
  return format(
    subDays(addYears(startDate, agreementYears), 1),
    SCHEDULE_DATE_FORMAT
  )
}

/**
 * Get the interval in months based on frequency
 * @param {string} frequency
 * @returns {number} months between payments
 */
function getFrequencyIntervalMonths(frequency = 'quarterly') {
  const intervals = {
    quarterly: 3
  }
  return intervals[frequency.toLowerCase()] || intervals.quarterly
}

/**
 * Get the last payment date of the agreement
 * @param {string} agreementEndDate
 * @returns {string} the last payment date of the agreement
 */
function getLastPaymentDate(agreementEndDate) {
  return format(endOfMonth(addDays(agreementEndDate, 1)), SCHEDULE_DATE_FORMAT)
}

/**
 *
 * @param {Date} startDate
 * @param {number} lengthYears
 * @param {string} frequency
 * @returns {PaymentSchedule} payment schedule
 */
export function generatePaymentSchedule(
  startDate,
  lengthYears,
  frequency = 'quarterly'
) {
  const schedule = []
  if (!lengthYears || Number.isNaN(Number(lengthYears))) {
    return {
      schedule,
      agreementEndDate: '',
      agreementStartDate: ''
    }
  }

  const agreementStartDate = getFirstDayOfNextMonth(startDate)
  const agreementEndDate = getAgreementEndDate(agreementStartDate, lengthYears)

  const intervalMonths = getFrequencyIntervalMonths(frequency)

  let currentPaymentDate = getPaymentDayForDate(
    addMonths(agreementStartDate, intervalMonths)
  )
  const lastPaymentDate = getLastPaymentDate(agreementEndDate)

  while (isBefore(currentPaymentDate, lastPaymentDate)) {
    schedule.push(format(currentPaymentDate, SCHEDULE_DATE_FORMAT))
    const nextMonth = addMonths(currentPaymentDate, intervalMonths)
    currentPaymentDate = getPaymentDayForDate(nextMonth)
  }

  return {
    agreementStartDate,
    agreementEndDate,
    schedule
  }
}

/**
 * @import { PaymentSchedule } from './payment-calculation.d.js'
 */
