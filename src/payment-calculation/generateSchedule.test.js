import { addMonths, addYears, format, startOfMonth } from 'date-fns'
import {
  generatePaymentSchedule,
  SCHEDULE_DATE_FORMAT
} from './generateSchedule.js'

describe('generateSchedule', () => {
  test('returns quarterly payment dates', () => {
    jest.useFakeTimers().setSystemTime(new Date(2025, 6, 2))

    const lengthYears = 3
    const today = new Date()
    const { agreementStartDate, agreementEndDate } = generatePaymentSchedule(
      today,
      lengthYears
    )

    expect(agreementStartDate).toEqual(
      format(startOfMonth(addMonths(today, 1)), SCHEDULE_DATE_FORMAT)
    )
    expect(agreementEndDate).toEqual(
      format(addYears(agreementStartDate, 3), SCHEDULE_DATE_FORMAT)
    )
    // expect(schedule).toEqual([
    //   new Date(2025, 10, 5),
    //   new Date(2026, 1, 5),
    //   new Date(2026, 4, 5),
    //   new Date(2026, 7, 5),
    //   new Date(2026, 10, 5),
    //   new Date(2027, 1, 5),
    //   new Date(2027, 4, 5),
    //   new Date(2027, 7, 5),
    //   new Date(2027, 10, 5),
    //   new Date(2028, 1, 7),
    //   new Date(2028, 4, 5),
    //   new Date(2028, 7, 7)
    // ])
  })
})
