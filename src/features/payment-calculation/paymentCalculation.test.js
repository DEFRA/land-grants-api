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

describe('getPaymentCalculationForParcels', () => {
  it('should return a valid payload for valid parcel data', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 6, 2))
    const durationYears = 1

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

    const firstPaymentLineItems = [
      {
        parcelItemId: 1,
        paymentPence: 90
      },
      {
        parcelItemId: 2,
        paymentPence: 219
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
    const expectedResponse = {
      agreementStartDate: '2025-08-01',
      agreementEndDate: '2026-07-31',
      frequency: 'Quarterly',
      agreementTotalPence: 38130,
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
          paymentDate: '2025-11-17',
          totalPaymentPence: 9534
        },
        {
          lineItems: otherPaymentLineItems,
          paymentDate: '2026-02-16',
          totalPaymentPence: 9532
        },
        {
          lineItems: otherPaymentLineItems,
          paymentDate: '2026-05-15',
          totalPaymentPence: 9532
        },
        {
          lineItems: otherPaymentLineItems,
          paymentDate: '2026-08-17',
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
    const durationYears = 1

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

    const firstPaymentLineItems = [
      {
        parcelItemId: 1,
        paymentPence: 90
      },
      {
        parcelItemId: 2,
        paymentPence: 219
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
    const expectedResponse = {
      agreementStartDate: '2026-02-01',
      agreementEndDate: '2027-01-31',
      frequency: 'Quarterly',
      agreementTotalPence: 38130,
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
          totalPaymentPence: 9534
        },
        {
          lineItems: otherPaymentLineItems,
          paymentDate: '2026-08-17',
          totalPaymentPence: 9532
        },
        {
          lineItems: otherPaymentLineItems,
          paymentDate: '2026-11-16',
          totalPaymentPence: 9532
        },
        {
          lineItems: otherPaymentLineItems,
          paymentDate: '2027-02-15',
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
})
