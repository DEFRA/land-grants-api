import { describe, test, expect, vi } from 'vitest'
import { wmpPaymentCalculateTransformer } from './wmp-payment-calculate.transformer.js'

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
  semanticVersion: '1.1.0',
  durationYears: 3
})

describe('pence rounding', () => {
  test('wmpPaymentCalculateTransformer produces integer agreementTotalPence', () => {
    const result = wmpPaymentCalculateTransformer(
      ['SX067-99238'],
      { ...createWmpCalculationResult(), payment: 10.001 },
      createAction(),
      '2024-01-01'
    )
    expect(Number.isInteger(result.agreementTotalPence)).toBe(true)
    expect(result.agreementTotalPence).toBe(1000)
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
      agreementStartDate: '2024-02-01',
      agreementEndDate: '2027-01-31',
      frequency: 'Single',
      agreementTotalPence: 234000,
      parcelItems: {},
      agreementLevelItems: {
        1: {
          code: 'PA3',
          description: 'Woodland Management Plan',
          version: '1.1.0',
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
          paymentDate: null,
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
    expect(result.agreementEndDate).toBe('2027-06-30')

    vi.useRealTimers()
  })
})
