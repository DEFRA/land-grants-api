import { isAfter, isBefore, isSameDay } from 'date-fns'

/**
 * Filter expired actions
 * @param {AgreementAction} action - The action to filter
 * @param {Date} [referenceDate] - The date to check activity against, defaults to now
 * @returns {boolean} True if the action is not expired, false otherwise
 */
export function expiredActionsFilter(
  { startDate, endDate },
  referenceDate = new Date()
) {
  return (
    (isBefore(startDate, referenceDate) ||
      isSameDay(startDate, referenceDate)) &&
    isAfter(endDate, referenceDate)
  )
}

/**
 * @import {AgreementAction} from '~/src/features/agreements/agreements.d.js'
 */
