import { generatePaymentSchedule } from './generateSchedule.js'

describe('generateSchedule', () => {
  it('should return an empty schedule array if no lengthYears is specified', () => {
    jest.useFakeTimers().setSystemTime(new Date(2025, 6, 2))
    const today = new Date()

    const { schedule } = generatePaymentSchedule(today)

    expect(schedule).toEqual([])
  })

  it('should return an empty schedule array if lengthYears is not a number', () => {
    jest.useFakeTimers().setSystemTime(new Date(2025, 6, 2))
    const today = new Date()

    const { schedule } = generatePaymentSchedule(today, 'lengthInYears')

    expect(schedule).toEqual([])
  })

  it('should return a schedule of payment dates for quarterly frequency for 3 years', () => {
    jest.useFakeTimers().setSystemTime(new Date(2025, 6, 2))

    const lengthYears = 3
    const frequency = 'quarterly'
    const today = new Date()
    const { agreementStartDate, agreementEndDate, schedule } =
      generatePaymentSchedule(today, lengthYears, frequency)

    expect(agreementStartDate).toBe('2025-08-01')
    expect(agreementEndDate).toBe('2028-08-01')

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
  })

  it('should return a schedule of payment dates for yearly frequency for 5 years', () => {
    jest.useFakeTimers().setSystemTime(new Date(2025, 6, 2))

    const lengthYears = 5
    const frequency = 'yearly'
    const today = new Date()
    const { agreementStartDate, agreementEndDate, schedule } =
      generatePaymentSchedule(today, lengthYears, frequency)

    expect(agreementStartDate).toBe('2025-08-01')
    expect(agreementEndDate).toBe('2030-08-01')

    expect(schedule).toEqual([
      '2026-08-05',
      '2027-08-05',
      '2028-08-07',
      '2029-08-06',
      '2030-08-05'
    ])
  })

  it('should return a schedule of payment dates for monthly frequency for 1 year', () => {
    jest.useFakeTimers().setSystemTime(new Date(2025, 6, 2))

    const lengthYears = 1
    const frequency = 'monthly'
    const today = new Date()
    const { agreementStartDate, agreementEndDate, schedule } =
      generatePaymentSchedule(today, lengthYears, frequency)

    expect(agreementStartDate).toBe('2025-08-01')
    expect(agreementEndDate).toBe('2026-08-01')

    expect(schedule).toEqual([
      '2025-09-05',
      '2025-10-06',
      '2025-11-05',
      '2025-12-05',
      '2026-01-05',
      '2026-02-05',
      '2026-03-05',
      '2026-04-06',
      '2026-05-05',
      '2026-06-05',
      '2026-07-06',
      '2026-08-05'
    ])
  })
})
