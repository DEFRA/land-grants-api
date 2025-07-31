import { getPaymentCalculationForParcels } from './paymentCalculation.js'

const mockEnabledActions = [
  {
    code: 'CMOR1',
    description: 'Assess moorland and produce a written record',
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
    applicationUnitOfMeasurement: 'ha',
    durationYears: 3,
    payment: {
      ratePerUnitGbp: 6,
      ratePerAgreementPerYearGbp: 97
    }
  }
]

describe('getPaymentCalculationForParcels', () => {
  it('should return empty response if no actions are being passed', () => {
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
      }
    ]
    const response = getPaymentCalculationForParcels(parcels)

    expect(response).toEqual({})
  })

  it('should return a valid payload for valid parcel data', () => {
    jest.useFakeTimers().setSystemTime(new Date(2025, 6, 2))
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

    const expectedLineItem = [
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
      agreementEndDate: '2026-08-01',
      frequency: 'Quarterly',
      agreementTotalPence: 38130,
      annualTotalPence: 38130, // -- Is this right? If this isn't divisible by 3 (or X years) then one year will be different. Should this be an array?

      parcelItems: {
        1: {
          code: 'CMOR1',
          description: 'Assess moorland and produce a written record',
          unit: 'ha',
          quantity: 0.34,
          rateInPence: 1060,
          annualPaymentPence: 360.40000000000003,
          sheetId: 'SD5253',
          parcelId: '5484'
        },
        2: {
          code: 'CSAM1',
          description:
            'Assess soil, test soil organic matter and produce a soil management plan',
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
          annualPaymentPence: 27200
        },
        2: {
          code: 'CSAM1',
          description:
            'Assess soil, test soil organic matter and produce a soil management plan',
          annualPaymentPence: 9700
        }
      },
      payments: [
        {
          lineItems: expectedLineItem,
          paymentDate: '2025-11-05',
          totalPaymentPence: 9534
        },
        {
          lineItems: expectedLineItem,
          paymentDate: '2026-02-05',
          totalPaymentPence: 9532
        },
        {
          lineItems: expectedLineItem,
          paymentDate: '2026-05-05',
          totalPaymentPence: 9532
        },
        {
          lineItems: expectedLineItem,
          paymentDate: '2026-08-05',
          totalPaymentPence: 9532
        }
      ]
    }

    const response = getPaymentCalculationForParcels(
      parcels,
      mockEnabledActions,
      durationYears
    )

    expect(response).toEqual(expectedResponse)
  })
})
