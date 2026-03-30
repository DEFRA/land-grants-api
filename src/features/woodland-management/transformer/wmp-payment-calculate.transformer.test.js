import { describe, test, expect, vi } from 'vitest'
import {
  getAgreementStartDate,
  getAgreementEndDate,
  transformPayments,
  transformAgreementLevelItems,
  wmpPaymentCalculateTransformer
} from './wmp-payment-calculate.transformer.js'

const createTiers = () => [
  { flatRateGbp: 1500, ratePerUnitGbp: 0, lowerLimitExclusiveHa: 0.5 },
  { flatRateGbp: 1500, ratePerUnitGbp: 30, lowerLimitExclusiveHa: 50.9999 },
  { flatRateGbp: 3000, ratePerUnitGbp: 15, lowerLimitExclusiveHa: 100 }
]

const createWmpCalculationResult = (tiers = createTiers()) => ({
  eligibleArea: 80,
  payment: 2370,
  tierValues: [
    { tier: tiers[0], value: 1500 },
    { tier: tiers[1], value: 2370 },
    { tier: tiers[2], value: 0 }
  ]
})

const createAction = () => ({
  code: 'PA3',
  description: 'Woodland Management Plan',
  semanticVersion: '1.0.0',
  durationYears: 5
})

describe('getAgreementStartDate', () => {
  test('should return the provided startDate formatted as YYYY-MM-DD', () => {
    expect(getAgreementStartDate('2024-06-15')).toBe('2024-06-15')
  })

  test('should return the 1st of next month when no startDate is provided', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15'))

    expect(getAgreementStartDate(undefined)).toBe('2024-02-01')

    vi.useRealTimers()
  })

  test('should return the 1st of next month when no startDate is provided at end of year', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-12-20'))

    expect(getAgreementStartDate(undefined)).toBe('2025-01-01')

    vi.useRealTimers()
  })
})

describe('getAgreementEndDate', () => {
  test('should return the date durationYears after the agreementStartDate', () => {
    expect(getAgreementEndDate('2024-01-01', 5)).toBe('2029-01-01')
  })

  test('should handle a 1-year duration', () => {
    expect(getAgreementEndDate('2024-06-15', 1)).toBe('2025-06-15')
  })
})

describe('transformPayments', () => {
  test('should return a single payment entry with the payment amount and date', () => {
    const result = transformPayments(createWmpCalculationResult(), '2024-01-01')

    expect(result).toEqual([
      {
        totalPaymentPence: 2370,
        paymentDate: '2024-01-01',
        lineItems: [{ agreementLevelItemId: 1, paymentPence: 2370 }]
      }
    ])
  })
})

describe('transformAgreementLevelItems', () => {
  test('should map tierValues to tiers with the correct rates and values', () => {
    const tiers = createTiers()
    const paymentResult = createWmpCalculationResult(tiers)
    const action = createAction()

    const result = transformAgreementLevelItems(
      ['SX067-99238'],
      action,
      paymentResult
    )

    expect(result[1].tiers).toEqual([
      {
        number: 1,
        quantity: 80,
        rateInPence: 0,
        flatRateInPence: 1500,
        totalInPence: 1500
      },
      {
        number: 2,
        quantity: 80,
        rateInPence: 30,
        flatRateInPence: 1500,
        totalInPence: 2370
      },
      {
        number: 3,
        quantity: 80,
        rateInPence: 15,
        flatRateInPence: 3000,
        totalInPence: 0
      }
    ])
  })

  test('should populate action metadata and eligible area on the agreement level item', () => {
    const result = transformAgreementLevelItems(
      ['SX067-99238', 'SX068-00001'],
      createAction(),
      createWmpCalculationResult()
    )

    expect(result[1]).toMatchObject({
      code: 'PA3',
      description: 'Woodland Management Plan',
      version: '1.0.0',
      parcelIds: ['SX067-99238', 'SX068-00001'],
      agreementTotalPence: 2370,
      unit: 'ha',
      quantity: 80
    })
  })
})

describe('wmpPaymentCalculateTransformer', () => {
  test('should return the full response shape with a fixed startDate', () => {
    const result = wmpPaymentCalculateTransformer(
      ['SX067-99238'],
      createWmpCalculationResult(),
      createAction(),
      '2024-01-01'
    )

    expect(result).toEqual({
      explanations: [],
      agreementStartDate: '2024-01-01',
      agreementEndDate: '2029-01-01',
      frequency: 'Single',
      agreementTotalPence: 2370,
      parcelItems: {},
      agreementLevelItems: {
        1: {
          code: 'PA3',
          description: 'Woodland Management Plan',
          version: '1.0.0',
          parcelIds: ['SX067-99238'],
          tiers: [
            {
              number: 1,
              quantity: 80,
              rateInPence: 0,
              flatRateInPence: 1500,
              totalInPence: 1500
            },
            {
              number: 2,
              quantity: 80,
              rateInPence: 30,
              flatRateInPence: 1500,
              totalInPence: 2370
            },
            {
              number: 3,
              quantity: 80,
              rateInPence: 15,
              flatRateInPence: 3000,
              totalInPence: 0
            }
          ],
          agreementTotalPence: 2370,
          unit: 'ha',
          quantity: 80
        }
      },
      payments: [
        {
          totalPaymentPence: 2370,
          paymentDate: '2024-01-01',
          lineItems: [{ agreementLevelItemId: 1, paymentPence: 2370 }]
        }
      ]
    })
  })

  test('should derive the startDate from the 1st of next month when not provided', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-10'))

    const result = wmpPaymentCalculateTransformer(
      ['SX067-99238'],
      createWmpCalculationResult(),
      createAction(),
      undefined
    )

    expect(result.agreementStartDate).toBe('2024-07-01')
    expect(result.agreementEndDate).toBe('2029-07-01')

    vi.useRealTimers()
  })
})
