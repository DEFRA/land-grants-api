import { isAfter, isBefore, isSameDay } from 'date-fns'

/**
 * Filter expired actions
 * @param {AgreementAction} action - The action to filter
 * @returns {boolean} True if the action is not expired, false otherwise
 */
export function expiredActionsFilter({ startDate, endDate }) {
  return (
    (isBefore(startDate, new Date()) || isSameDay(startDate, new Date())) &&
    isAfter(endDate, new Date())
  )
}

/**
 * @import {AgreementAction} from '~/src/features/agreements/agreements.d.js'
 */
