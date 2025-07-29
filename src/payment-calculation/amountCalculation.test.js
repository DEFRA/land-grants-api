import { calculatePayments, createPaymentItems } from './amountCalculation.js'

describe('calculatePayments', () => {
  it('should return total payment amounts', () => {
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

    const enabledActions = [
      {
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        applicationUnitOfMeasurement: 'ha',
        durationYears: 3,
        payment: {
          ratePerUnitGbp: 10.6,
          ratePerAgreementPerYearGbp: 272
        },
        rateInPence: 600,
        annualPaymentPence: 12000
      }
    ]

    const { agreementTotalPence, annualTotalPence } = calculatePayments(
      parcels,
      enabledActions
    )

    expect(agreementTotalPence).toBe(82681.20000000001)
    expect(annualTotalPence).toBe(27560.4)
  })
})

describe('createPaymentItems', () => {
  it('should return a list of parcel items with payment info', () => {
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

    const enabledActions = [
      {
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        applicationUnitOfMeasurement: 'ha',
        durationYears: 3,
        payment: {
          ratePerUnitGbp: 10.63,
          ratePerAgreementPerYearGbp: 272
        },
        rateInPence: 600,
        annualPaymentPence: 12000
      }
    ]

    const { parcelItems } = createPaymentItems(parcels, enabledActions)

    expect(parcelItems).toEqual({
      1: {
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        unit: 'ha',
        quantity: 0.34,
        rateInPence: 1063,
        annualPaymentPence: 27200,
        sheetId: 'SD5253',
        parcelId: '5484'
      }
    })
  })

  it('should return a list of agreement items with payment info', () => {
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

    const enabledActions = [
      {
        code: 'CMOR1',
        description: 'Assess moorland and produce a written record',
        applicationUnitOfMeasurement: 'ha',
        durationYears: 3,
        payment: {
          ratePerUnitGbp: 10.63,
          ratePerAgreementPerYearGbp: 272
        },
        rateInPence: 600,
        annualPaymentPence: 12000
      }
    ]

    const { agreementItems } = createPaymentItems(parcels, enabledActions)

    expect(agreementItems).toEqual({
      1: {
        code: 'CMOR1',
        description: 'Assess moorland and produce a written record',
        annualPaymentPence: 27200
      }
    })
  })
})
