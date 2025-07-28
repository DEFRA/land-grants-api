import { addMonths, addYears, format, startOfMonth } from 'date-fns'

export const SCHEDULE_DATE_FORMAT = 'yyyy-MM-dd'

/**
 *
 * @returns the first of next month
 */
export function getFirstDayOfNextMonth() {
  return format(startOfMonth(addMonths(new Date(), 1)), SCHEDULE_DATE_FORMAT)
}

/**
 *
 * @returns the first of next month
 */
export function getAgreementEndDate(startDate, agreementYears) {
  return format(addYears(startDate, agreementYears), SCHEDULE_DATE_FORMAT)
}

/**
 *
 * @param {Date} startDate
 * @param {number} lengthYears
 * @param {string} frequency
 * @returns {Array<Date>} payment schedule
 */
export function generatePaymentSchedule(
  startDate,
  lengthYears,
  frequency = 'quarterly'
) {
  const agreementStartDate = getFirstDayOfNextMonth()
  const agreementEndDate = getAgreementEndDate(startDate, lengthYears)
  return {
    agreementStartDate,
    agreementEndDate
  }
}
