import { vi } from 'vitest'
import { generatePaymentSchedule } from './generateSchedule.js'

describe('generateSchedule', () => {
  it('should return an empty schedule array if no lengthYears is specified', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 6, 2))
    const today = new Date()

    const { schedule } = generatePaymentSchedule(today)

    expect(schedule).toEqual([])
    vi.useRealTimers()
  })

  it('should return an empty schedule array if lengthYears is not a number', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 6, 2))
    const today = new Date()

    const { schedule } = generatePaymentSchedule(today, 'lengthInYears')

    expect(schedule).toEqual([])
    vi.useRealTimers()
  })

  it('should return a schedule of payment dates for quarterly frequency for 3 years', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 6, 2))

    const lengthYears = 3
    const frequency = 'quarterly'
    const today = new Date()
    const { agreementStartDate, agreementEndDate, schedule } =
      generatePaymentSchedule(today, lengthYears, frequency)

    expect(agreementStartDate).toBe('2025-08-01')
    expect(agreementEndDate).toBe('2028-07-31')

    expect(schedule).toEqual([
      '2025-11-05',
      '2026-02-05',
      '2026-05-05',
      '2026-08-05',
      '2026-11-05',
      '2027-02-05',
      '2027-05-05',
      '2027-08-05',
      '2027-11-05',
      '2028-02-07',
      '2028-05-05',
      '2028-08-07'
    ])
    vi.useRealTimers()
  })
})
