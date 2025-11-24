import {
  calculateAnnualAndAgreementTotals,
  calculateScheduledPayments,
  createPaymentItems,
  reconcilePaymentAmounts,
  roundPaymentAmountForPaymentLineItems
} from './amountCalculation.js'

const mockEnabledActions = [
  {
    code: 'CMOR1',
    description: 'CMOR1: Assess moorland and produce a written record',
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
    description: 'UPL1: Moderate livestock grazing on moorland',
    version: 1,
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
      'CSAM1: Assess soil, produce a soil management plan and test soil organic matter',
    version: 1,
    applicationUnitOfMeasurement: 'ha',
    durationYears: 3,
    payment: {
      ratePerUnitGbp: 600,
      ratePerAgreementPerYearGbp: 9700
    }
  }
]

describe('calculateAnnualAndAgreementTotals', () => {
  const durationYears = 3

  it('should return total payment amounts for parcel and agreement items', () => {
    const payments = [
      {
        lineItems: [],
        paymentDate: '2025-11-05',
        totalPaymentPence: 1916
      },
      {
        lineItems: [],
        paymentDate: '2026-02-05',
        totalPaymentPence: 1916
      },
      {
        lineItems: [],
        paymentDate: '2026-05-05',
        totalPaymentPence: 1916
      },
      {
        lineItems: [],
        paymentDate: '2026-08-05',
        totalPaymentPence: 1916
      }
    ]

    const { agreementTotalPence, annualTotalPence } =
      calculateAnnualAndAgreementTotals(payments, durationYears)

    expect(agreementTotalPence).toBe(7664)
    expect(annualTotalPence).toBe(2554)
  })

  it('should handle no payments', () => {
    const payments = {}

    const { agreementTotalPence, annualTotalPence } =
      calculateAnnualAndAgreementTotals(payments, durationYears)

    expect(agreementTotalPence).toBe(0)
    expect(annualTotalPence).toBe(0)
  })
})

describe('createPaymentItems', () => {
  it('should handle missing payment rates gracefully', () => {
    const actionsWithMissingRates = [
      {
        code: 'CMOR1',
        description: 'Test action',
        version: 1,
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

    expect(parcelItems).toEqual({
      1: {
        code: 'CMOR1',
        description: 'Test action',
        version: 1,
        parcelId: '5484',
        durationYears: 3,
        quantity: 0.34,
        rateInPence: 0,
        annualPaymentPence: 0,
        sheetId: 'SD5253',
        unit: 'ha'
      }
    })
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
        version: 1,
        durationYears: 3,
        unit: 'ha',
        quantity: 0.34,
        rateInPence: 1060,
        annualPaymentPence: 360.40000000000003,
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
        durationYears: 3,
        version: 1,
        annualPaymentPence: 27200
      }
    })
  })

  it('should return a list of parcel items with payment info for different parcel ids', () => {
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
        sheetId: 'SD5444',
        parcelId: '1234',
        actions: [
          {
            code: 'CMOR1',
            quantity: 0.99
          }
        ]
      }
    ]

    const { parcelItems } = createPaymentItems(parcels, mockEnabledActions)

    expect(parcelItems).toEqual({
      1: {
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        version: 1,
        unit: 'ha',
        durationYears: 3,
        quantity: 0.34,
        rateInPence: 1060,
        annualPaymentPence: 360.40000000000003,
        sheetId: 'SD5253',
        parcelId: '5484'
      },
      2: {
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        version: 1,
        unit: 'ha',
        durationYears: 3,
        quantity: 0.99,
        rateInPence: 1060,
        annualPaymentPence: 1049.4,
        sheetId: 'SD5444',
        parcelId: '1234'
      }
    })
  })

  it('should only add agreement level items once for the same action', () => {
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
        sheetId: 'SD5253',
        parcelId: '5484',
        actions: [
          {
            code: 'UPL1',
            quantity: 1.45
          }
        ]
      },
      {
        sheetId: 'SD5111',
        parcelId: '2222',
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
            quantity: 9.48
          }
        ]
      }
    ]

    const { agreementItems } = createPaymentItems(parcels, mockEnabledActions)

    expect(agreementItems).toEqual({
      1: {
        code: 'CMOR1',
        version: 1,
        description: 'CMOR1: Assess moorland and produce a written record',
        durationYears: 3,
        annualPaymentPence: 27200
      },
      2: {
        code: 'CSAM1',
        description:
          'CSAM1: Assess soil, produce a soil management plan and test soil organic matter',
        durationYears: 3,
        version: 1,
        annualPaymentPence: 970000
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
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        version: 1,
        parcelId: '5484',
        durationYears: 3,
        quantity: 0.34,
        rateInPence: 1060,
        annualPaymentPence: 360.40000000000003,
        sheetId: 'SD5253',
        unit: 'ha'
      },
      2: {
        code: 'UPL1',
        version: 1,
        description: 'UPL1: Moderate livestock grazing on moorland',
        parcelId: '5485',
        durationYears: 3,
        quantity: 2.5,
        rateInPence: 2000,
        annualPaymentPence: 5000,
        sheetId: 'SD5254',
        unit: 'ha'
      }
    })

    expect(agreementItems).toEqual({
      1: {
        annualPaymentPence: 27200,
        code: 'CMOR1',
        durationYears: 3,
        version: 1,
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
        code: 'UPL1',
        description: 'UPL1: Moderate livestock grazing on moorland',
        version: 1,
        parcelId: '5485',
        durationYears: 3,
        quantity: 2.5,
        rateInPence: 2000,
        annualPaymentPence: 5000,
        sheetId: 'SD5254',
        unit: 'ha'
      }
    })

    expect(agreementItems).toEqual({})
  })
})

describe('reconcilePaymentAmounts', () => {
  it('should shift extra pennies to the first scheduled payment', () => {
    const payments = [
      {
        lineItems: [],
        paymentDate: '2025-11-05',
        totalPaymentPence: 1916.783
      },
      {
        lineItems: [],
        paymentDate: '2026-02-05',
        totalPaymentPence: 1916.783
      },
      {
        lineItems: [],
        paymentDate: '2026-05-05',
        totalPaymentPence: 1916.783
      },
      {
        lineItems: [],
        paymentDate: '2026-08-05',
        totalPaymentPence: 1916.783
      }
    ]

    const response = reconcilePaymentAmounts([], [], payments)

    expect(response.payments).toEqual([
      {
        lineItems: [],
        paymentDate: '2025-11-05',
        totalPaymentPence: 1919
      },
      {
        lineItems: [],
        paymentDate: '2026-02-05',
        totalPaymentPence: 1916
      },
      {
        lineItems: [],
        paymentDate: '2026-05-05',
        totalPaymentPence: 1916
      },
      {
        lineItems: [],
        paymentDate: '2026-08-05',
        totalPaymentPence: 1916
      }
    ])
  })

  it('should floor round line items payments from payments input', () => {
    const payments = [
      {
        lineItems: [
          {
            parcelItemId: 1,
            paymentPence: 123.88
          },
          {
            parcelItemId: 2,
            paymentPence: 555
          },
          {
            parcelItemId: 3,
            paymentPence: 19337.8
          }
        ],
        paymentDate: '2025-11-05',
        totalPaymentPence: 20016.68
      }
    ]

    const result = roundPaymentAmountForPaymentLineItems(payments)

    expect(result).toEqual([
      {
        lineItems: [
          {
            parcelItemId: 1,
            paymentPence: 123
          },
          {
            parcelItemId: 2,
            paymentPence: 555
          },
          {
            parcelItemId: 3,
            paymentPence: 19337
          }
        ],
        paymentDate: '2025-11-05',
        totalPaymentPence: 20016.68
      }
    ])
  })

  it('should round parcel level items payment amount from input', () => {
    const parcelItems = {
      1: {
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        quantity: 0.34,
        rateInPence: 1060,
        annualPaymentPence: 360.40000000000003
      },
      2: {
        code: 'UPL1',
        quantity: 2.5,
        rateInPence: 2000,
        annualPaymentPence: 5000.23
      }
    }

    const result = reconcilePaymentAmounts(parcelItems, [], [])

    expect(result.parcelItems).toEqual({
      1: {
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        quantity: 0.34,
        rateInPence: 1060,
        annualPaymentPence: 360
      },
      2: {
        code: 'UPL1',
        quantity: 2.5,
        rateInPence: 2000,
        annualPaymentPence: 5000
      }
    })
  })

  it('should round agreement level items payment amount from input', () => {
    const agreementItems = {
      1: {
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        annualPaymentPence: 272.123
      }
    }

    const result = reconcilePaymentAmounts([], agreementItems, [])

    expect(result.agreementLevelItems).toEqual({
      1: {
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        annualPaymentPence: 272
      }
    })
  })

  it('should return empty arrays if no payments are passed', () => {
    const result = reconcilePaymentAmounts([], [], [])

    expect(result.payments).toEqual([])
    expect(result.explanations).toEqual({
      content: [],
      title: 'Payment calculation'
    })
  })
})

describe('calculateScheduledPayments', () => {
  it('should return an empty array if no schedule is being passed', () => {
    const parcelItems = {}
    const agreementItems = {}
    const schedule = []
    const result = calculateScheduledPayments(
      parcelItems,
      agreementItems,
      schedule
    )

    expect(result).toEqual([])
  })

  it('should return a schedule of empty payments if no items are being passed', () => {
    const parcelItems = {}
    const agreementItems = {}

    const schedule = ['2025-11-05', '2026-02-05', '2026-05-05', '2026-08-05']
    const result = calculateScheduledPayments(
      parcelItems,
      agreementItems,
      schedule
    )

    expect(result).toEqual(
      schedule.map((paymentDate) => ({
        totalPaymentPence: 0,
        paymentDate,
        lineItems: []
      }))
    )
  })

  it('should return an array of scheduled payments', () => {
    const parcelItems = {
      1: {
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        quantity: 0.34,
        rateInPence: 1060,
        annualPaymentPence: 360.40000000000003
      },
      2: {
        code: 'UPL1',
        quantity: 2.5,
        rateInPence: 2000,
        annualPaymentPence: 5000
      },
      3: {
        code: 'UPL2',
        quantity: 0.94,
        rateInPence: 5300,
        annualPaymentPence: 4982
      }
    }
    const agreementItems = {
      1: {
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        annualPaymentPence: 27200
      }
    }

    const schedule = [
      '2025-11-05',
      '2026-02-05',
      '2026-05-05',
      '2026-08-05',
      '2026-11-05',
      '2027-02-05',
      '2027-05-05',
      '2027-08-05'
    ]

    const result = calculateScheduledPayments(
      parcelItems,
      agreementItems,
      schedule
    )

    // CMOR1 => (1060 * 0.34) / 4
    const cmor1ParcelPayment = (1060 * 0.34) / 4
    const cmor1AgreementPayment = 27200 / 4
    const upl1ParcelPayment = (2.5 * 2000) / 4
    const upl2ParcelPayment = (0.94 * 5300) / 4
    const totalPaymentPence = Math.floor(
      cmor1ParcelPayment +
        cmor1AgreementPayment +
        upl1ParcelPayment +
        upl2ParcelPayment
    )

    const lineItems = [
      {
        parcelItemId: 1,
        paymentPence: cmor1ParcelPayment
      },
      {
        parcelItemId: 2,
        paymentPence: upl1ParcelPayment
      },
      {
        parcelItemId: 3,
        paymentPence: upl2ParcelPayment
      },
      {
        agreementLevelItemId: 1,
        paymentPence: cmor1AgreementPayment
      }
    ]

    expect(result).toEqual(
      schedule.map((paymentDate) => ({
        totalPaymentPence,
        paymentDate,
        lineItems
      }))
    )
  })

  it('should return a schedule of payments if schedule has 1 date being passed', () => {
    const parcelItems = {
      1: {
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        quantity: 0.34,
        rateInPence: 1060,
        annualPaymentPence: 360.40000000000003
      },
      2: {
        code: 'UPL1',
        quantity: 2.5,
        rateInPence: 2000,
        annualPaymentPence: 5000
      },
      3: {
        code: 'UPL2',
        quantity: 0.94,
        rateInPence: 5300,
        annualPaymentPence: 4982
      }
    }
    const agreementItems = {
      1: {
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        annualPaymentPence: 27200
      }
    }

    const schedule = ['2025-11-05']

    const result = calculateScheduledPayments(
      parcelItems,
      agreementItems,
      schedule
    )

    // CMOR1 => (1060 * 0.34) / 4
    const cmor1ParcelPayment = 1060 * 0.34
    const cmor1AgreementPayment = 27200
    const upl1ParcelPayment = 2.5 * 2000
    const upl2ParcelPayment = 0.94 * 5300
    const totalPaymentPence = Math.floor(
      cmor1ParcelPayment +
        cmor1AgreementPayment +
        upl1ParcelPayment +
        upl2ParcelPayment
    )

    const lineItems = [
      {
        parcelItemId: 1,
        paymentPence: cmor1ParcelPayment
      },
      {
        parcelItemId: 2,
        paymentPence: upl1ParcelPayment
      },
      {
        parcelItemId: 3,
        paymentPence: upl2ParcelPayment
      },
      {
        agreementLevelItemId: 1,
        paymentPence: cmor1AgreementPayment
      }
    ]

    expect(result).toEqual(
      schedule.map((paymentDate) => ({
        totalPaymentPence,
        paymentDate,
        lineItems
      }))
    )
  })
})
