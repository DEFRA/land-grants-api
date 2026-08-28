import { expiredActionsFilter } from '~/src/features/agreements/transformers/filters.js'

const basicAgreement = {
  actionCode: 'UPL1',
  quantity: 100,
  unit: 'sqm'
}

describe('getAgreements', () => {
  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(new Date('2025-12-01T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should filter out agreements which have expired or are in the future', () => {
    const early = [
      { startDate: new Date('2020-01-01'), endDate: new Date('2024-12-01') }, // expired last year
      { startDate: new Date('2020-01-01'), endDate: new Date('2025-11-30') }, // expired yesterday
      { startDate: new Date('2020-01-01'), endDate: new Date('2025-12-01') } // expired today
    ]
    const late = [
      { startDate: new Date('2025-12-02'), endDate: new Date('2045-01-01') }, // starts tomorrow
      { startDate: new Date('2026-01-01'), endDate: new Date('2045-01-01') } // starts next year
    ]
    const current = [
      { startDate: new Date('2025-12-01'), endDate: new Date('2025-12-02') }, // starts today
      { startDate: new Date('2020-01-01'), endDate: new Date('2045-01-01') } // many years
    ]
    const agreements = [...early, ...current, ...late].map((a) => ({
      ...a,
      ...basicAgreement
    }))

    const expected = current.map((a) => ({ ...a, ...basicAgreement }))
    const actual = agreements.filter((a) => expiredActionsFilter(a))

    expect(actual).toEqual(expected)
  })

  it('should filter using an explicit referenceDate instead of the system clock', () => {
    const referenceDate = new Date('2019-06-01')

    const agreements = [
      // active around referenceDate, but expired "now" (per fake timer)
      {
        startDate: new Date('2019-01-01'),
        endDate: new Date('2019-12-31'),
        ...basicAgreement
      },
      // active "now", but not yet started at referenceDate
      {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2030-01-01'),
        ...basicAgreement
      }
    ]

    const actual = agreements.filter((a) =>
      expiredActionsFilter(a, referenceDate)
    )

    expect(actual).toEqual([agreements[0]])
  })
})
