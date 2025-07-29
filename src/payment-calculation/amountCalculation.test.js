import { calculatePayments, createPaymentItems } from './amountCalculation.js'

const mockEnabledActions = [
  {
    code: 'CMOR1',
    description: 'CMOR1: Assess moorland and produce a written record',
    applicationUnitOfMeasurement: 'ha',
    durationYears: 3,
    payment: {
      ratePerUnitGbp: 10.6,
      ratePerAgreementPerYearGbp: 272
    }
  },
  {
    code: 'UPL1',
    description: 'UPL1: Moderate livestock grazing on moorland',
    applicationUnitOfMeasurement: 'ha',
    durationYears: 3,
    payment: {
      ratePerUnitGbp: 20,
      ratePerAgreementPerYearGbp: 0
    }
  },
  {
    code: 'OFM1',
    description: 'OFM1: Organic land management – improved permanent grassland',
    applicationUnitOfMeasurement: 'ha',
    durationYears: 3,
    payment: {
      ratePerUnitGbp: 20,
      ratePerAgreementPerYearGbp: 0
    }
  }
]

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

    const { agreementTotalPence, annualTotalPence } = calculatePayments(
      parcels,
      mockEnabledActions
    )

    expect(agreementTotalPence).toBe(82681.20000000001)
    expect(annualTotalPence).toBe(27560.4)
  })

  it('should handle multiple parcels with different actions', () => {
    const parcels = [
      {
        sheetId: 'SD5253',
        parcelId: '5484',
        actions: [{ code: 'CMOR1', quantity: 0.34 }]
      },
      {
        sheetId: 'SD5254',
        parcelId: '5485',
        actions: [{ code: 'UPL1', quantity: 2.5 }]
      }
    ]

    const { agreementTotalPence, annualTotalPence } = calculatePayments(
      parcels,
      mockEnabledActions
    )

    expect(agreementTotalPence).toBe(97681.20000000001)
    expect(annualTotalPence).toBe(32560.4) // 0.34 * 1060 + 27200 + 2.5 * 2000
  })

  it('should handle empty parcels array', () => {
    const { agreementTotalPence, annualTotalPence } = calculatePayments(
      [],
      mockEnabledActions
    )

    expect(agreementTotalPence).toBe(0)
    expect(annualTotalPence).toBe(0)
  })

  it('should handle parcels with no actions', () => {
    const parcels = [
      {
        sheetId: 'SD5253',
        parcelId: '5484',
        actions: []
      }
    ]

    const { agreementTotalPence, annualTotalPence } = calculatePayments(
      parcels,
      mockEnabledActions
    )

    expect(agreementTotalPence).toBe(0)
    expect(annualTotalPence).toBe(0)
  })

  it('should throw error when action code is not found', () => {
    const parcels = [
      {
        sheetId: 'SD5253',
        parcelId: '5484',
        actions: [{ code: 'NONEXISTENT', quantity: 1 }]
      }
    ]

    expect(() => calculatePayments(parcels, mockEnabledActions)).toThrow(
      "Action with code 'NONEXISTENT' not found"
    )
  })

  it('should throw error when actions array is empty', () => {
    const parcels = [
      {
        sheetId: 'SD5253',
        parcelId: '5484',
        actions: [{ code: 'CMOR1', quantity: 1 }]
      }
    ]

    expect(() => calculatePayments(parcels, [])).toThrow(
      "Action with code 'CMOR1' not found"
    )
  })

  it('should handle missing payment rates gracefully', () => {
    const actionsWithMissingRates = [
      {
        code: 'CMOR1',
        description: 'Test action',
        applicationUnitOfMeasurement: 'ha',
        durationYears: 3,
        payment: {}
      }
    ]

    const parcels = [
      {
        sheetId: 'SD5253',
        parcelId: '5484',
        actions: [{ code: 'CMOR1', quantity: 0.34 }]
      }
    ]

    const { agreementTotalPence, annualTotalPence } = calculatePayments(
      parcels,
      actionsWithMissingRates
    )

    expect(agreementTotalPence).toBe(0)
    expect(annualTotalPence).toBe(0)
  })
})

describe('createPaymentItems', () => {
  it('should throw error when action code is not found', () => {
    const parcels = [
      {
        sheetId: 'SD5253',
        parcelId: '5484',
        actions: [{ code: 'NONEXISTENT', quantity: 1 }]
      }
    ]

    expect(() => createPaymentItems(parcels, mockEnabledActions)).toThrow(
      "Action with code 'NONEXISTENT' not found"
    )
  })

  it('should throw error when actions array is empty', () => {
    const parcels = [
      {
        sheetId: 'SD5253',
        parcelId: '5484',
        actions: [{ code: 'CMOR1', quantity: 1 }]
      }
    ]

    expect(() => createPaymentItems(parcels, [])).toThrow(
      "Action with code 'CMOR1' not found"
    )
  })

  it('should handle missing payment rates gracefully', () => {
    const actionsWithMissingRates = [
      {
        code: 'CMOR1',
        description: 'Test action',
        applicationUnitOfMeasurement: 'ha',
        durationYears: 3,
        payment: {}
      }
    ]

    const parcels = [
      {
        sheetId: 'SD5253',
        parcelId: '5484',
        actions: [{ code: 'CMOR1', quantity: 0.34 }]
      }
    ]

    const { parcelItems, agreementItems } = createPaymentItems(
      parcels,
      actionsWithMissingRates
    )

    expect(parcelItems[1].rateInPence).toBe(0)
    expect(parcelItems[1].annualPaymentPence).toBe(0)
    expect(agreementItems).toEqual({})
  })

  it('should handle empty parcels array', () => {
    const { parcelItems, agreementItems } = createPaymentItems(
      [],
      mockEnabledActions
    )

    expect(parcelItems).toEqual({})
    expect(agreementItems).toEqual({})
  })

  it('should handle parcels with no actions', () => {
    const parcels = [
      {
        sheetId: 'SD5253',
        parcelId: '5484',
        actions: []
      }
    ]

    const { parcelItems, agreementItems } = createPaymentItems(
      parcels,
      mockEnabledActions
    )

    expect(parcelItems).toEqual({})
    expect(agreementItems).toEqual({})
  })

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

    const { parcelItems } = createPaymentItems(parcels, mockEnabledActions)

    expect(parcelItems).toEqual({
      1: {
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        unit: 'ha',
        quantity: 0.34,
        rateInPence: 1060,
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

    const { agreementItems } = createPaymentItems(parcels, mockEnabledActions)

    expect(agreementItems).toEqual({
      1: {
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        annualPaymentPence: 27200
      }
    })
  })

  it('should handle multiple parcels with different actions', () => {
    const parcels = [
      {
        sheetId: 'SD5253',
        parcelId: '5484',
        actions: [{ code: 'CMOR1', quantity: 0.34 }]
      },
      {
        sheetId: 'SD5254',
        parcelId: '5485',
        actions: [{ code: 'UPL1', quantity: 2.5 }]
      }
    ]

    const { parcelItems, agreementItems } = createPaymentItems(
      parcels,
      mockEnabledActions
    )

    expect(parcelItems).toEqual({
      1: {
        annualPaymentPence: 27200,
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        parcelId: '5484',
        quantity: 0.34,
        rateInPence: 1060,
        sheetId: 'SD5253',
        unit: 'ha'
      },
      2: {
        annualPaymentPence: 0,
        code: 'UPL1',
        description: 'UPL1: Moderate livestock grazing on moorland',
        parcelId: '5485',
        quantity: 2.5,
        rateInPence: 2000,
        sheetId: 'SD5254',
        unit: 'ha'
      }
    })

    expect(agreementItems).toEqual({
      1: {
        annualPaymentPence: 27200,
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record'
      }
    })
  })

  it('should not create agreement items when ratePerAgreementPerYearGbp is 0', () => {
    const parcels = [
      {
        sheetId: 'SD5254',
        parcelId: '5485',
        actions: [{ code: 'UPL1', quantity: 2.5 }]
      }
    ]

    const { parcelItems, agreementItems } = createPaymentItems(
      parcels,
      mockEnabledActions
    )

    expect(parcelItems).toEqual({
      1: {
        annualPaymentPence: 0,
        code: 'UPL1',
        description: 'UPL1: Moderate livestock grazing on moorland',
        parcelId: '5485',
        quantity: 2.5,
        rateInPence: 2000,
        sheetId: 'SD5254',
        unit: 'ha'
      }
    })

    expect(agreementItems).toEqual({})
  })
})
