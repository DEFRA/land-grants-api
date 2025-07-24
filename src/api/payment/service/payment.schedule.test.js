import { addMonths, addDays } from 'date-fns'

import {
  getAgreementStartDate,
  getClosestWorkingDay,
  calculatePaymentSchedule,
  calculatePaymentAmounts
} from './payment.schedule.js'

describe('calculatePaymentSchedule', () => {
  test('returns quarterly payment dates', () => {
    jest.useFakeTimers().setSystemTime(new Date(2025, 6, 2))

    const dates = calculatePaymentSchedule(27200)

    expect(dates.agreementStartDate).toEqual(new Date(2025, 7, 1))
    expect(dates.payments).toEqual([
      {
        paymentDate: new Date(2025, 10, 6),
        amountInPence: 6800
      },
      {
        paymentDate: new Date(2026, 1, 6),
        amountInPence: 6800
      },
      {
        paymentDate: new Date(2026, 4, 6),
        amountInPence: 6800
      },
      {
        paymentDate: new Date(2026, 7, 6),
        amountInPence: 6800
      }
    ])
  })

  test('returns quarterly payment dates where some are weekends', () => {
    jest.useFakeTimers().setSystemTime(new Date(2025, 7, 2))

    const dates = calculatePaymentSchedule(27233)

    expect(dates.agreementStartDate).toEqual(new Date(2025, 8, 1))
    expect(dates.payments).toEqual([
      {
        paymentDate: new Date(2025, 11, 8),
        amountInPence: 6809
      },
      {
        paymentDate: new Date(2026, 2, 6),
        amountInPence: 6808
      },
      {
        paymentDate: new Date(2026, 5, 8),
        amountInPence: 6808
      },
      {
        paymentDate: new Date(2026, 8, 7),
        amountInPence: 6808
      }
    ])
  })
})

describe('getAgreementStartDate', () => {
  test('returns first of next month', () => {
    const date = getAgreementStartDate()

    expect(date.getMonth()).toEqual(addMonths(new Date(), 1).getMonth())
    expect(date.getDate()).toBe(1)
  })
})

describe('getClosestWorkingDay', () => {
  test('returns date passed in when not a weekend date', () => {
    const date = new Date(2025, 6, 22)
    const workingDate = getClosestWorkingDay(date)

    expect(workingDate).toEqual(date)
    expect(workingDate.getDate()).toBe(22)
  })

  test('returns the next monday when a sunday date', () => {
    const date = new Date(2025, 6, 20)
    const workingDate = getClosestWorkingDay(date)

    expect(workingDate).toEqual(addDays(date, 1))
    expect(workingDate.getDay()).toBe(1)
  })

  test('returns the next monday when a saturday date', () => {
    const date = new Date(2025, 6, 19)
    const workingDate = getClosestWorkingDay(date)

    expect(workingDate.getDay()).toBe(1)
    expect(workingDate.getDate()).toBe(21)
  })
})

describe('calculatePaymentAmounts', () => {
  test('returns even split', () => {
    const res = calculatePaymentAmounts(100, { totalPayments: 4 })

    expect(res).toEqual([25, 25, 25, 25])
  })

  test('amount not divisble by payments amount', () => {
    const res = calculatePaymentAmounts(101, { totalPayments: 4 })

    expect(res).toEqual([26, 25, 25, 25])
  })

  test('large amount not divisble by payments amount', () => {
    const res = calculatePaymentAmounts(27201, { totalPayments: 4 })

    expect(res).toEqual([6801, 6800, 6800, 6800])
  })
})
