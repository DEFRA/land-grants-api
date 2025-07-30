import {
  calculateScheduledPayments,
  calculateTotalPayments,
  createPaymentItems,
  shiftPenniesToFirstScheduledPayment
} from './amountCalculation.js'

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

describe('calculateTotalPayments', () => {
  const durationYears = 3

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

    const { agreementTotalPence, annualTotalPence } = calculateTotalPayments(
      parcels,
      mockEnabledActions,
      durationYears
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

    const { agreementTotalPence, annualTotalPence } = calculateTotalPayments(
      parcels,
      mockEnabledActions,
      durationYears
    )

    expect(agreementTotalPence).toBe(97681.20000000001)
    expect(annualTotalPence).toBe(32560.4) // CMOR1 -> (0.34 * 1060 + 27200) + (2.5 * 2000)
  })

  it('should handle empty parcels array', () => {
    const { agreementTotalPence, annualTotalPence } = calculateTotalPayments(
      [],
      mockEnabledActions,
      durationYears
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

    const { agreementTotalPence, annualTotalPence } = calculateTotalPayments(
      parcels,
      mockEnabledActions,
      durationYears
    )

    expect(agreementTotalPence).toBe(0)
    expect(annualTotalPence).toBe(0)
  })

  it('should return zero when action code is not found', () => {
    const parcels = [
      {
        sheetId: 'SD5253',
        parcelId: '5484',
        actions: [{ code: 'NONEXISTENT', quantity: 1 }]
      }
    ]

    const result = calculateTotalPayments(
      parcels,
      mockEnabledActions,
      durationYears
    )
    expect(result).toEqual({ agreementTotalPence: 0, annualTotalPence: 0 })
  })

  it('should return zero when actions array is empty', () => {
    const parcels = [
      {
        sheetId: 'SD5253',
        parcelId: '5484',
        actions: []
      }
    ]
    const result = calculateTotalPayments(
      parcels,
      mockEnabledActions,
      durationYears
    )

    expect(result).toEqual({ agreementTotalPence: 0, annualTotalPence: 0 })
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

    const { agreementTotalPence, annualTotalPence } = calculateTotalPayments(
      parcels,
      actionsWithMissingRates,
      durationYears
    )

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
        parcelId: '5484',
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
        unit: 'ha',
        quantity: 0.34,
        rateInPence: 1060,
        annualPaymentPence: 360.40000000000003,
        sheetId: 'SD5253',
        parcelId: '5484'
      },
      2: {
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        unit: 'ha',
        quantity: 0.99,
        rateInPence: 1060,
        annualPaymentPence: 1049.4,
        sheetId: 'SD5444',
        parcelId: '1234'
      }
    })
  })

  it('should return a single agreement items per action with payment info', () => {
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
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        parcelId: '5484',
        quantity: 0.34,
        rateInPence: 1060,
        annualPaymentPence: 360.40000000000003,
        sheetId: 'SD5253',
        unit: 'ha'
      },
      2: {
        code: 'UPL1',
        description: 'UPL1: Moderate livestock grazing on moorland',
        parcelId: '5485',
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
        parcelId: '5485',
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

describe('shiftPenniesToFirstScheduledPayment', () => {
  it('should shift extra pennies to the first scheduled payment', () => {
    const lineItems = [
      {
        parcelItemId: 1,
        paymentPence: 9000.75
      }
    ]
    const payments = [
      {
        lineItems,
        paymentDate: '2025-11-05',
        totalPaymentPence: 308.25
      },
      {
        lineItems,
        paymentDate: '2026-02-05',
        totalPaymentPence: 308.25
      },
      {
        lineItems,
        paymentDate: '2026-05-05',
        totalPaymentPence: 308.25
      },
      {
        lineItems,
        paymentDate: '2026-08-05',
        totalPaymentPence: 308.25
      }
    ]

    const revisedPayments = shiftPenniesToFirstScheduledPayment(payments)

    expect(revisedPayments).toEqual([
      {
        lineItems: [
          {
            parcelItemId: 1,
            paymentPence: 9003
          }
        ],
        paymentDate: '2025-11-05',
        totalPaymentPence: 308.25
      },
      {
        lineItems: [
          {
            parcelItemId: 1,
            paymentPence: 9000
          }
        ],
        paymentDate: '2026-02-05',
        totalPaymentPence: 308.25
      },
      {
        lineItems: [
          {
            parcelItemId: 1,
            paymentPence: 9000
          }
        ],
        paymentDate: '2026-05-05',
        totalPaymentPence: 308.25
      },
      {
        lineItems: [
          {
            parcelItemId: 1,
            paymentPence: 9000
          }
        ],
        paymentDate: '2026-08-05',
        totalPaymentPence: 308.25
      }
    ])
  })

  it('should round if extra pennies left on shifted payment amount', () => {
    const lineItems = [
      {
        parcelItemId: 1,
        paymentPence: 9000.66
      },
      {
        parcelItemId: 2,
        paymentPence: 800
      }
    ]
    const payments = [
      {
        lineItems,
        paymentDate: '2025-11-05',
        totalPaymentPence: 308.25
      },
      {
        lineItems,
        paymentDate: '2026-02-05',
        totalPaymentPence: 308.25
      },
      {
        lineItems,
        paymentDate: '2026-05-05',
        totalPaymentPence: 308.25
      },
      {
        lineItems,
        paymentDate: '2026-08-05',
        totalPaymentPence: 308.25
      }
    ]

    const revisedPayments = shiftPenniesToFirstScheduledPayment(payments)

    expect(revisedPayments).toEqual([
      {
        lineItems: [
          {
            parcelItemId: 1,
            paymentPence: 9002
          }
        ],
        paymentDate: '2025-11-05',
        totalPaymentPence: 308.25
      },
      {
        lineItems: [
          {
            parcelItemId: 1,
            paymentPence: 9000
          }
        ],
        paymentDate: '2026-02-05',
        totalPaymentPence: 308.25
      },
      {
        lineItems: [
          {
            parcelItemId: 1,
            paymentPence: 9000
          }
        ],
        paymentDate: '2026-05-05',
        totalPaymentPence: 308.25
      },
      {
        lineItems: [
          {
            parcelItemId: 1,
            paymentPence: 9000
          }
        ],
        paymentDate: '2026-08-05',
        totalPaymentPence: 308.25
      }
    ])
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
    const totalPaymentPence =
      cmor1ParcelPayment +
      cmor1AgreementPayment +
      upl1ParcelPayment +
      upl2ParcelPayment

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
