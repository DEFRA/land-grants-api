import { describe, test, expect, vi } from 'vitest'
import {
  getAgreementStartDate,
  getAgreementEndDate,
  transformPayments,
  transformAgreementLevelItems,
  wmpPaymentCalculateTransformer
} from './wmp-payment-calculate.transformer.js'

const createWmpCalculationResult = () => ({
  eligibleArea: 78,
  payment: 2340,
  activePaymentTier: 2,
  quantityInActiveTier: 28,
  activeTierRatePence: 30,
  activeTierFlatRatePence: 1500
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
  test('should return a single payment entry with the payment amount converted to pence', () => {
    const result = transformPayments(createWmpCalculationResult(), '2024-01-01')

    expect(result).toEqual([
      {
        totalPaymentPence: 234000,
        paymentDate: '2024-01-01',
        lineItems: [{ agreementLevelItemId: 1, paymentPence: 234000 }]
      }
    ])
  })
})

describe('transformAgreementLevelItems', () => {
  test('should map active tier values from the payment result converting GBP to pence', () => {
    const result = transformAgreementLevelItems(
      ['SX067-99238'],
      createAction(),
      createWmpCalculationResult()
    )

    expect(result[1].activePaymentTier).toBe(2)
    expect(result[1].quantityInActiveTier).toBe(28)
    expect(result[1].activeTierRatePence).toBe(3000)
    expect(result[1].activeTierFlatRatePence).toBe(150000)
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
      agreementTotalPence: 234000,
      unit: 'ha',
      quantity: 78
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
      agreementTotalPence: 234000,
      parcelItems: {},
      agreementLevelItems: {
        1: {
          code: 'PA3',
          description: 'Woodland Management Plan',
          version: '1.0.0',
          parcelIds: ['SX067-99238'],
          activePaymentTier: 2,
          quantityInActiveTier: 28,
          activeTierRatePence: 3000,
          activeTierFlatRatePence: 150000,
          agreementTotalPence: 234000,
          unit: 'ha',
          quantity: 78
        }
      },
      payments: [
        {
          totalPaymentPence: 234000,
          paymentDate: '2024-01-01',
          lineItems: [{ agreementLevelItemId: 1, paymentPence: 234000 }]
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
