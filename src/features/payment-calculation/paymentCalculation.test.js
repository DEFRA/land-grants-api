import { vi } from 'vitest'
import { getPaymentCalculationForParcels } from './paymentCalculation.js'

const mockEnabledActions = [
  {
    code: 'CMOR1',
    description: 'Assess moorland and produce a written record',
    version: 1,
    applicationUnitOfMeasurement: 'ha',
    durationYears: 3,
    payment: {
      ratePerUnitGbp: 10.6,
      ratePerAgreementPerYearGbp: 272
    }
  },
  {
    code: 'UPL1',
    description: 'Moderate livestock grazing on moorland',
    version: 1,
    applicationUnitOfMeasurement: 'ha',
    durationYears: 3,
    payment: {
      ratePerUnitGbp: 20,
      ratePerAgreementPerYearGbp: 0
    }
  },
  {
    code: 'CSAM1',
    description:
      'Assess soil, test soil organic matter and produce a soil management plan',
    version: 1,
    applicationUnitOfMeasurement: 'ha',
    durationYears: 3,
    payment: {
      ratePerUnitGbp: 6,
      ratePerAgreementPerYearGbp: 97
    }
  }
]

const firstPaymentLineItems = [
  {
    parcelItemId: 1,
    paymentPence: 90
  },
  {
    parcelItemId: 2,
    paymentPence: 223
  },
  {
    agreementLevelItemId: 1,
    paymentPence: 6800
  },
  {
    agreementLevelItemId: 2,
    paymentPence: 2425
  }
]
const otherPaymentLineItems = [
  {
    parcelItemId: 1,
    paymentPence: 90
  },
  {
    parcelItemId: 2,
    paymentPence: 217
  },
  {
    agreementLevelItemId: 1,
    paymentPence: 6800
  },
  {
    agreementLevelItemId: 2,
    paymentPence: 2425
  }
]

describe('getPaymentCalculationForParcels', () => {
  it('should return a valid payload for valid parcel data', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 6, 2))
    const durationYears = 3

    const parcels = [
      {
        sheetId: 'SD5253',
        parcelId: '5484',
        actions: [
          {
            code: 'CMOR1',
            quantity: 0.34
          }
        ]
      },
      {
        sheetId: 'SD5111',
        parcelId: '2222',
        actions: [
          {
            code: 'CSAM1',
            quantity: 1.45
          }
        ]
      }
    ]

    const expectedResponse = {
      agreementStartDate: '2025-08-01',
      agreementEndDate: '2028-07-31',
      frequency: 'Quarterly',
      agreementTotalPence: 114390,
      annualTotalPence: 38130,
      parcelItems: {
        1: {
          code: 'CMOR1',
          description: 'Assess moorland and produce a written record',
          version: 1,
          unit: 'ha',
          quantity: 0.34,
          durationYears: 3,
          rateInPence: 1060,
          annualPaymentPence: 360,
          sheetId: 'SD5253',
          parcelId: '5484'
        },
        2: {
          code: 'CSAM1',
          description:
            'Assess soil, test soil organic matter and produce a soil management plan',
          version: 1,
          durationYears: 3,
          unit: 'ha',
          quantity: 1.45,
          rateInPence: 600,
          annualPaymentPence: 870,
          sheetId: 'SD5111',
          parcelId: '2222'
        }
      },
      agreementLevelItems: {
        1: {
          code: 'CMOR1',
          description: 'Assess moorland and produce a written record',
          durationYears: 3,
          version: 1,
          annualPaymentPence: 27200
        },
        2: {
          code: 'CSAM1',
          description:
            'Assess soil, test soil organic matter and produce a soil management plan',
          durationYears: 3,
          version: 1,
          annualPaymentPence: 9700
        }
      },
      payments: [
        {
          lineItems: firstPaymentLineItems,
          paymentDate: '2025-11-15',
          totalPaymentPence: 9538
        },
        {
          lineItems: otherPaymentLineItems,
          paymentDate: '2026-02-15',
          totalPaymentPence: 9532
        },
        {
          lineItems: otherPaymentLineItems,
          paymentDate: '2026-05-15',
          totalPaymentPence: 9532
        },
        {
          lineItems: otherPaymentLineItems,
          paymentDate: '2026-08-15',
          totalPaymentPence: 9532
        },
        {
          lineItems: otherPaymentLineItems,
          paymentDate: '2026-11-15',
          totalPaymentPence: 9532
        },
        {
          lineItems: otherPaymentLineItems,
          paymentDate: '2027-02-15',
          totalPaymentPence: 9532
        },
        {
          lineItems: otherPaymentLineItems,
          paymentDate: '2027-05-15',
          totalPaymentPence: 9532
        },
        {
          lineItems: otherPaymentLineItems,
          paymentDate: '2027-08-15',
          totalPaymentPence: 9532
        },
        {
          lineItems: otherPaymentLineItems,
          paymentDate: '2027-11-15',
          totalPaymentPence: 9532
        },
        {
          lineItems: otherPaymentLineItems,
          paymentDate: '2028-02-15',
          totalPaymentPence: 9532
        },
        {
          lineItems: otherPaymentLineItems,
          paymentDate: '2028-05-15',
          totalPaymentPence: 9532
        },
        {
          lineItems: otherPaymentLineItems,
          paymentDate: '2028-08-15',
          totalPaymentPence: 9532
        }
      ],
      explanations: expect.any(Array)
    }

    const response = getPaymentCalculationForParcels(
      parcels,
      mockEnabledActions,
      durationYears
    )

    expect(response).toEqual(expectedResponse)
    vi.useRealTimers()
  })

  it('should return a response based on startDate if provided', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 6, 2))
    const durationYears = 3

    const parcels = [
      {
        sheetId: 'SD5253',
        parcelId: '5484',
        actions: [
          {
            code: 'CMOR1',
            quantity: 0.34
          }
        ]
      },
      {
        sheetId: 'SD5111',
        parcelId: '2222',
        actions: [
          {
            code: 'CSAM1',
            quantity: 1.45
          }
        ]
      }
    ]

    const expectedResponse = {
      agreementStartDate: '2026-02-01',
      agreementEndDate: '2029-01-31',
      frequency: 'Quarterly',
      agreementTotalPence: 114390,
      annualTotalPence: 38130,
      parcelItems: {
        1: {
          code: 'CMOR1',
          description: 'Assess moorland and produce a written record',
          durationYears: 3,
          version: 1,
          unit: 'ha',
          quantity: 0.34,
          rateInPence: 1060,
          annualPaymentPence: 360,
          sheetId: 'SD5253',
          parcelId: '5484'
        },
        2: {
          code: 'CSAM1',
          description:
            'Assess soil, test soil organic matter and produce a soil management plan',
          durationYears: 3,
          version: 1,
          unit: 'ha',
          quantity: 1.45,
          rateInPence: 600,
          annualPaymentPence: 870,
          sheetId: 'SD5111',
          parcelId: '2222'
        }
      },
      agreementLevelItems: {
        1: {
          code: 'CMOR1',
          description: 'Assess moorland and produce a written record',
          durationYears: 3,
          version: 1,
          annualPaymentPence: 27200
        },
        2: {
          code: 'CSAM1',
          description:
            'Assess soil, test soil organic matter and produce a soil management plan',
          durationYears: 3,
          version: 1,
          annualPaymentPence: 9700
        }
      },
      payments: [
        {
          lineItems: firstPaymentLineItems,
          paymentDate: '2026-05-15',
          totalPaymentPence: 9538
        },
        {
          lineItems: otherPaymentLineItems,
          paymentDate: '2026-08-15',
          totalPaymentPence: 9532
        },
        {
          lineItems: otherPaymentLineItems,
          paymentDate: '2026-11-15',
          totalPaymentPence: 9532
        },
        {
          lineItems: otherPaymentLineItems,
          paymentDate: '2027-02-15',
          totalPaymentPence: 9532
        },
        {
          lineItems: otherPaymentLineItems,
          paymentDate: '2027-05-15',
          totalPaymentPence: 9532
        },
        {
          lineItems: otherPaymentLineItems,
          paymentDate: '2027-08-15',
          totalPaymentPence: 9532
        },
        {
          lineItems: otherPaymentLineItems,
          paymentDate: '2027-11-15',
          totalPaymentPence: 9532
        },
        {
          lineItems: otherPaymentLineItems,
          paymentDate: '2028-02-15',
          totalPaymentPence: 9532
        },
        {
          lineItems: otherPaymentLineItems,
          paymentDate: '2028-05-15',
          totalPaymentPence: 9532
        },
        {
          lineItems: otherPaymentLineItems,
          paymentDate: '2028-08-15',
          totalPaymentPence: 9532
        },
        {
          lineItems: otherPaymentLineItems,
          paymentDate: '2028-11-15',
          totalPaymentPence: 9532
        },
        {
          lineItems: otherPaymentLineItems,
          paymentDate: '2029-02-15',
          totalPaymentPence: 9532
        }
      ],
      explanations: expect.any(Array)
    }

    const response = getPaymentCalculationForParcels(
      parcels,
      mockEnabledActions,
      durationYears,
      '2026-01-01'
    )

    expect(response).toEqual(expectedResponse)
    vi.useRealTimers()
  })

  it('should calculate payments using each action duration when durations differ', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 1, 1))

    const mixedDurationActions = [
      {
        code: 'CLIG3',
        description: 'Manage grassland with very low nutrient inputs',
        version: 1,
        applicationUnitOfMeasurement: 'ha',
        durationYears: 1,
        payment: {
          ratePerUnitGbp: 151
        }
      },
      {
        code: 'CSAM3',
        description: 'Herbal leys',
        version: 1,
        applicationUnitOfMeasurement: 'ha',
        durationYears: 1,
        payment: {
          ratePerUnitGbp: 224
        }
      },
      {
        code: 'SCR2',
        description: 'Manage scrub and open habitat mosaics',
        version: 1,
        applicationUnitOfMeasurement: 'ha',
        durationYears: 3,
        payment: {
          ratePerUnitGbp: 350
        }
      }
    ]

    const parcels = [
      {
        sheetId: 'NT8907',
        parcelId: '2407',
        actions: [
          { code: 'CLIG3', quantity: 7.2444 },
          { code: 'SCR2', quantity: 10 }
        ]
      },
      {
        sheetId: 'SK7949',
        parcelId: '9475',
        actions: [
          { code: 'CSAM3', quantity: 20 },
          { code: 'SCR2', quantity: 15.1978 }
        ]
      }
    ]

    const response = getPaymentCalculationForParcels(
      parcels,
      mixedDurationActions,
      3,
      '2026-02-01'
    )

    expect(response.agreementTotalPence).toBe(3203159)
    expect(response.annualTotalPence).toBe(1439313)

    expect(response.payments).toHaveLength(12)

    // The 1-year actions (CLIG3, CSAM3) are only paid during the first 4
    // payments, while the 3-year action (SCR2) is paid for all 12 payments.
    const firstYearPayments = response.payments.slice(0, 4)
    const remainingPayments = response.payments.slice(4)

    for (const payment of firstYearPayments) {
      const codes = payment.lineItems.map(
        (item) => response.parcelItems[item.parcelItemId]?.code
      )
      expect(codes).toEqual(
        expect.arrayContaining(['CLIG3', 'CSAM3', 'SCR2', 'SCR2'])
      )
    }

    for (const payment of remainingPayments) {
      const codes = payment.lineItems.map(
        (item) => response.parcelItems[item.parcelItemId]?.code
      )
      expect(codes).toEqual(['SCR2', 'SCR2'])
    }

    // The sum of all scheduled payments must exactly equal the agreement total
    const sumOfPayments = response.payments.reduce(
      (acc, payment) => acc + payment.totalPaymentPence,
      0
    )
    expect(sumOfPayments).toBe(response.agreementTotalPence)
    vi.useRealTimers()
  })
})
