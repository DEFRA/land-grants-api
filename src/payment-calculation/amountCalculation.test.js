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
  },
  {
    code: 'MISSING_ACTION_DATA',
    payment: {}
  }
]

describe('calculateAnnualAndAgreementTotals', () => {
  const durationYears = 3

  it('should return total payment amounts for parcel and agreement items', () => {
    const parcelItems = {
      1: {
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        parcelId: '5484',
        durationYears: 3,
        quantity: 0.34,
        rateInPence: 1060,
        annualPaymentPence: 360.4,
        sheetId: 'SD5253',
        unit: 'ha'
      }
    }
    const agreementItems = {
      1: {
        code: 'CMOR1',
        durationYears: 3,
        description: 'CMOR1: Assess moorland and produce a written record',
        annualPaymentPence: 27200
      }
    }

    const { agreementTotalPence, annualTotalPence } =
      calculateAnnualAndAgreementTotals(
        parcelItems,
        agreementItems,
        durationYears
      )

    expect(agreementTotalPence).toBe(82681)
    expect(annualTotalPence).toBe(27560)
  })

  it('should handle multiple parcels items and agreement items with different actions', () => {
    const parcelItems = {
      1: {
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        parcelId: '5484',
        durationYears: 3,
        quantity: 0.34,
        rateInPence: 1060,
        annualPaymentPence: 360.4,
        sheetId: 'SD5253',
        unit: 'ha'
      },
      2: {
        code: 'UPL1',
        description: 'Moderate livestock grazing on moorland',
        parcelId: '5485',
        durationYears: 3,
        quantity: 2.5,
        rateInPence: 2000,
        annualPaymentPence: 5000,
        sheetId: 'SD5254',
        unit: 'ha'
      }
    }
    const agreementItems = {
      1: {
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        durationYears: 3,
        annualPaymentPence: 27200
      }
    }

    const { agreementTotalPence, annualTotalPence } =
      calculateAnnualAndAgreementTotals(
        parcelItems,
        agreementItems,
        durationYears
      )

    expect(agreementTotalPence).toBe(97681)
    expect(annualTotalPence).toBe(32560) // CMOR1 -> (0.34 * 1060 + 27200) + (2.5 * 2000)
  })

  it('should handle no parcel items and agreement items', () => {
    const parcelItems = {}
    const agreementItems = {}

    const { agreementTotalPence, annualTotalPence } =
      calculateAnnualAndAgreementTotals(
        parcelItems,
        agreementItems,
        durationYears
      )

    expect(agreementTotalPence).toBe(0)
    expect(annualTotalPence).toBe(0)
  })

  it('should handle items with undefined annualPaymentPence', () => {
    const parcelItems = {
      1: {
        annualPaymentPence: undefined
      }
    }
    const agreementItems = {
      1: {
        annualPaymentPence: null
      }
    }

    const { agreementTotalPence, annualTotalPence } =
      calculateAnnualAndAgreementTotals(
        parcelItems,
        agreementItems,
        durationYears
      )

    expect(agreementTotalPence).toBe(0)
    expect(annualTotalPence).toBe(0)
  })

  it('should handle missing payment rates gracefully', () => {
    const parcelItems = {
      1: {
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        version: 1,
        parcelId: '5484',
        durationYears: 3,
        quantity: undefined,
        rateInPence: undefined,
        annualPaymentPence: undefined,
        sheetId: 'SD5253',
        unit: 'ha'
      },
      2: {
        code: 'UPL1',
        description: 'Moderate livestock grazing on moorland',
        version: 1,
        durationYears: 3,
        parcelId: '5485',
        quantity: undefined,
        rateInPence: undefined,
        annualPaymentPence: undefined,
        sheetId: 'SD5254',
        unit: 'ha'
      }
    }
    const agreementItems = {
      1: {
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        version: 1,
        durationYears: 3,
        annualPaymentPence: undefined
      }
    }

    const { agreementTotalPence, annualTotalPence } =
      calculateAnnualAndAgreementTotals(
        parcelItems,
        agreementItems,
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

  it('should return parcel and agreement items with payment info for multiple parcels', () => {
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

    const { parcelItems, agreementItems } = createPaymentItems(
      parcels,
      mockEnabledActions
    )

    expect(parcelItems).toEqual({
      1: {
        code: 'CMOR1',
        description: 'CMOR1: Assess moorland and produce a written record',
        version: 1,
        unit: 'ha',
        durationYears: 3,
        quantity: 0.34,
        rateInPence: 1060,
        annualPaymentPence: 360,
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
        annualPaymentPence: 1049,
        sheetId: 'SD5444',
        parcelId: '1234'
      }
    })

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
        annualPaymentPence: 360,
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

  it('should skip actions that are not in the enabled actions list', () => {
    const parcels = [
      {
        sheetId: 'SD5253',
        parcelId: '5484',
        actions: [
          { code: 'CMOR1', quantity: 0.34 },
          { code: 'UNKNOWN_ACTION', quantity: 1.5 }
        ]
      }
    ]

    const { parcelItems } = createPaymentItems(parcels, mockEnabledActions)

    expect(Object.keys(parcelItems)).toHaveLength(1)
    expect(parcelItems[1].code).toBe('CMOR1')
  })

  it('should handle multiple actions on same parcel with one having agreement payment', () => {
    const parcels = [
      {
        sheetId: 'SD5253',
        parcelId: '5484',
        actions: [
          { code: 'CMOR1', quantity: 0.34 },
          { code: 'UPL1', quantity: 2.5 }
        ]
      }
    ]

    const { parcelItems, agreementItems } = createPaymentItems(
      parcels,
      mockEnabledActions
    )

    expect(Object.keys(parcelItems)).toHaveLength(2)
    expect(Object.keys(agreementItems)).toHaveLength(1)
    expect(agreementItems[1].code).toBe('CMOR1')
  })
})

describe('reconcilePaymentAmounts', () => {
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

  it('should return empty arrays if no payments are passed', () => {
    const result = reconcilePaymentAmounts([], [], [])

    expect(result.payments).toEqual([])
    expect(result.explanations).toEqual({
      content: [],
      title: 'Payment calculation'
    })
  })

  it('should shift pennies to specific line items in first payment for parcel items', () => {
    const parcelItems = {
      1: {
        code: 'CMOR1',
        annualPaymentPence: 360,
        durationYears: 3
      },
      2: {
        code: 'CSAM1',
        annualPaymentPence: 870,
        durationYears: 3
      }
    }

    const payments = [
      {
        lineItems: [
          { parcelItemId: 1, paymentPence: 90 },
          { parcelItemId: 2, paymentPence: 217.5 }
        ],
        paymentDate: '2025-11-05',
        totalPaymentPence: 307.5
      },
      {
        lineItems: [
          { parcelItemId: 1, paymentPence: 90 },
          { parcelItemId: 2, paymentPence: 217.5 }
        ],
        paymentDate: '2026-02-05',
        totalPaymentPence: 307.5
      },
      {
        lineItems: [
          { parcelItemId: 1, paymentPence: 90 },
          { parcelItemId: 2, paymentPence: 217.5 }
        ],
        paymentDate: '2026-05-05',
        totalPaymentPence: 307.5
      },
      {
        lineItems: [
          { parcelItemId: 1, paymentPence: 90 },
          { parcelItemId: 2, paymentPence: 217.5 }
        ],
        paymentDate: '2026-08-05',
        totalPaymentPence: 307.5
      }
    ]

    const result = reconcilePaymentAmounts(parcelItems, {}, payments)

    // First payment should have pennies shifted to line items
    // parcelItem 1: (360 * 3) % 4 = 0 pennies
    // parcelItem 2: (870 * 3) % 4 = 2 pennies
    expect(result.payments[0].lineItems).toEqual([
      { parcelItemId: 1, paymentPence: 90 },
      { parcelItemId: 2, paymentPence: 219 } // 217 + 2
    ])

    // Other payments should have line items floored
    expect(result.payments[1].lineItems).toEqual([
      { parcelItemId: 1, paymentPence: 90 },
      { parcelItemId: 2, paymentPence: 217 } // floor(217.5)
    ])
  })

  it('should shift pennies to specific line items in first payment for agreement items', () => {
    const agreementItems = {
      1: {
        code: 'CMOR1',
        annualPaymentPence: 27200,
        durationYears: 3
      },
      2: {
        code: 'CSAM1',
        annualPaymentPence: 9700,
        durationYears: 3
      }
    }

    const payments = [
      {
        lineItems: [
          { agreementLevelItemId: 1, paymentPence: 6800 },
          { agreementLevelItemId: 2, paymentPence: 2425 }
        ],
        paymentDate: '2025-11-05',
        totalPaymentPence: 9225
      },
      {
        lineItems: [
          { agreementLevelItemId: 1, paymentPence: 6800 },
          { agreementLevelItemId: 2, paymentPence: 2425 }
        ],
        paymentDate: '2026-02-05',
        totalPaymentPence: 9225
      },
      {
        lineItems: [
          { agreementLevelItemId: 1, paymentPence: 6800 },
          { agreementLevelItemId: 2, paymentPence: 2425 }
        ],
        paymentDate: '2026-05-05',
        totalPaymentPence: 9225
      },
      {
        lineItems: [
          { agreementLevelItemId: 1, paymentPence: 6800 },
          { agreementLevelItemId: 2, paymentPence: 2425 }
        ],
        paymentDate: '2026-08-05',
        totalPaymentPence: 9225
      }
    ]

    const result = reconcilePaymentAmounts({}, agreementItems, payments)

    // agreementItem 1: (27200 * 3) % 4 = 0 pennies
    // agreementItem 2: (9700 * 3) % 4 = 0 pennies
    expect(result.payments[0].lineItems).toEqual([
      { agreementLevelItemId: 1, paymentPence: 6800 },
      { agreementLevelItemId: 2, paymentPence: 2425 }
    ])
  })

  it('should shift pennies to both parcel and agreement line items in first payment', () => {
    const parcelItems = {
      1: {
        code: 'TEST1',
        annualPaymentPence: 333,
        durationYears: 3
      }
    }

    const agreementItems = {
      1: {
        code: 'TEST1',
        annualPaymentPence: 555,
        durationYears: 3
      }
    }

    const payments = [
      {
        lineItems: [
          { parcelItemId: 1, paymentPence: 83.25 },
          { agreementLevelItemId: 1, paymentPence: 138.75 }
        ],
        paymentDate: '2025-11-05',
        totalPaymentPence: 222
      },
      {
        lineItems: [
          { parcelItemId: 1, paymentPence: 83.25 },
          { agreementLevelItemId: 1, paymentPence: 138.75 }
        ],
        paymentDate: '2026-02-05',
        totalPaymentPence: 222
      },
      {
        lineItems: [
          { parcelItemId: 1, paymentPence: 83.25 },
          { agreementLevelItemId: 1, paymentPence: 138.75 }
        ],
        paymentDate: '2026-05-05',
        totalPaymentPence: 222
      },
      {
        lineItems: [
          { parcelItemId: 1, paymentPence: 83.25 },
          { agreementLevelItemId: 1, paymentPence: 138.75 }
        ],
        paymentDate: '2026-08-05',
        totalPaymentPence: 222
      }
    ]

    const result = reconcilePaymentAmounts(
      parcelItems,
      agreementItems,
      payments
    )

    // parcelItem 1: (333 * 3) % 4 = 999 % 4 = 3 pennies
    // agreementItem 1: (555 * 3) % 4 = 1665 % 4 = 1 penny
    // Total shifted: 4 pennies
    expect(result.payments[0].lineItems).toEqual([
      { parcelItemId: 1, paymentPence: 86 }, // floor(83.25) + 3 = 83 + 3
      { agreementLevelItemId: 1, paymentPence: 139 } // floor(138.75) + 1 = 138 + 1
    ])

    expect(result.payments[0].totalPaymentPence).toBe(226) // 222 + 4

    // Other payments should just be floored
    expect(result.payments[1].lineItems).toEqual([
      { parcelItemId: 1, paymentPence: 83 },
      { agreementLevelItemId: 1, paymentPence: 138 }
    ])
  })

  it('should correctly shift pennies when there is only one payment', () => {
    const parcelItems = {
      1: {
        code: 'TEST1',
        annualPaymentPence: 870,
        durationYears: 3
      }
    }

    const payments = [
      {
        lineItems: [{ parcelItemId: 1, paymentPence: 2610 }],
        paymentDate: '2025-11-05',
        totalPaymentPence: 2610
      }
    ]

    const result = reconcilePaymentAmounts(parcelItems, {}, payments)

    // With only 1 payment: (870 * 3) % 1 = 0 pennies to shift
    expect(result.payments[0].lineItems).toEqual([
      { parcelItemId: 1, paymentPence: 2610 }
    ])
    expect(result.payments[0].totalPaymentPence).toBe(2610)
  })

  it('should handle decimal pennies that need shifting across multiple items', () => {
    const parcelItems = {
      1: {
        code: 'ITEM1',
        annualPaymentPence: 111,
        durationYears: 3
      },
      2: {
        code: 'ITEM2',
        annualPaymentPence: 222,
        durationYears: 3
      },
      3: {
        code: 'ITEM3',
        annualPaymentPence: 333,
        durationYears: 3
      }
    }

    const payments = [
      {
        lineItems: [
          { parcelItemId: 1, paymentPence: 27.75 },
          { parcelItemId: 2, paymentPence: 55.5 },
          { parcelItemId: 3, paymentPence: 83.25 }
        ],
        paymentDate: '2025-11-05',
        totalPaymentPence: 166.5
      },
      {
        lineItems: [
          { parcelItemId: 1, paymentPence: 27.75 },
          { parcelItemId: 2, paymentPence: 55.5 },
          { parcelItemId: 3, paymentPence: 83.25 }
        ],
        paymentDate: '2026-02-05',
        totalPaymentPence: 166.5
      },
      {
        lineItems: [
          { parcelItemId: 1, paymentPence: 27.75 },
          { parcelItemId: 2, paymentPence: 55.5 },
          { parcelItemId: 3, paymentPence: 83.25 }
        ],
        paymentDate: '2026-05-05',
        totalPaymentPence: 166.5
      },
      {
        lineItems: [
          { parcelItemId: 1, paymentPence: 27.75 },
          { parcelItemId: 2, paymentPence: 55.5 },
          { parcelItemId: 3, paymentPence: 83.25 }
        ],
        paymentDate: '2026-08-05',
        totalPaymentPence: 166.5
      }
    ]

    const result = reconcilePaymentAmounts(parcelItems, {}, payments)

    // Total: 6 pennies shifted to first payment
    expect(result.payments[0].lineItems).toEqual([
      { parcelItemId: 1, paymentPence: 28 }, // floor(27.75) + 1 = 27 + 1
      { parcelItemId: 2, paymentPence: 57 }, // floor(55.5) + 2 = 55 + 2
      { parcelItemId: 3, paymentPence: 86 } // floor(83.25) + 3 = 83 + 3
    ])
    expect(result.payments[0].totalPaymentPence).toBe(173) // Math.round(166.5 + 6) = Math.round(172.5)

    // Other payments should just be floored
    expect(result.payments[1].lineItems).toEqual([
      { parcelItemId: 1, paymentPence: 27 },
      { parcelItemId: 2, paymentPence: 55 },
      { parcelItemId: 3, paymentPence: 83 }
    ])
  })

  it('should return parcel and agreement items unchanged', () => {
    const parcelItems = {
      1: { code: 'CMOR1', annualPaymentPence: 360 }
    }
    const agreementItems = {
      1: { code: 'CMOR1', annualPaymentPence: 27200 }
    }

    const result = reconcilePaymentAmounts(parcelItems, agreementItems, [])

    expect(result.parcelItems).toBe(parcelItems)
    expect(result.agreementLevelItems).toBe(agreementItems)
  })

  it('should handle when parcel line item is not found in first payment', () => {
    const parcelItems = {
      1: {
        code: 'CMOR1',
        annualPaymentPence: 360,
        durationYears: 3
      },
      999: {
        code: 'MISSING',
        annualPaymentPence: 111,
        durationYears: 3
      }
    }

    const payments = [
      {
        lineItems: [{ parcelItemId: 1, paymentPence: 90 }],
        paymentDate: '2025-11-05',
        totalPaymentPence: 90
      },
      {
        lineItems: [{ parcelItemId: 1, paymentPence: 90 }],
        paymentDate: '2026-02-05',
        totalPaymentPence: 90
      },
      {
        lineItems: [{ parcelItemId: 1, paymentPence: 90 }],
        paymentDate: '2026-05-05',
        totalPaymentPence: 90
      },
      {
        lineItems: [{ parcelItemId: 1, paymentPence: 90 }],
        paymentDate: '2026-08-05',
        totalPaymentPence: 90
      }
    ]

    const result = reconcilePaymentAmounts(parcelItems, {}, payments)

    // Line item for parcelItemId 999 doesn't exist in payments
    // (360 * 3) % 4 = 0 pennies for item 1
    // (111 * 3) % 4 = 1 penny for item 999 (but line item not found, so added to total only)
    expect(result.payments[0].lineItems).toEqual([
      { parcelItemId: 1, paymentPence: 90 }
    ])
    expect(result.payments[0].totalPaymentPence).toBe(91) // 90 + 1 penny from missing item
  })

  it('should handle when agreement line item is not found in first payment', () => {
    const agreementItems = {
      1: {
        code: 'CMOR1',
        annualPaymentPence: 27200,
        durationYears: 3
      },
      999: {
        code: 'MISSING_AGREEMENT',
        annualPaymentPence: 555,
        durationYears: 3
      }
    }

    const payments = [
      {
        lineItems: [{ agreementLevelItemId: 1, paymentPence: 6800 }],
        paymentDate: '2025-11-05',
        totalPaymentPence: 6800
      },
      {
        lineItems: [{ agreementLevelItemId: 1, paymentPence: 6800 }],
        paymentDate: '2026-02-05',
        totalPaymentPence: 6800
      },
      {
        lineItems: [{ agreementLevelItemId: 1, paymentPence: 6800 }],
        paymentDate: '2026-05-05',
        totalPaymentPence: 6800
      },
      {
        lineItems: [{ agreementLevelItemId: 1, paymentPence: 6800 }],
        paymentDate: '2026-08-05',
        totalPaymentPence: 6800
      }
    ]

    const result = reconcilePaymentAmounts({}, agreementItems, payments)

    // Line item for agreementLevelItemId 999 doesn't exist in payments
    // (27200 * 3) % 4 = 0 pennies for item 1
    // (555 * 3) % 4 = 1 penny for item 999 (but line item not found, so added to total only)
    expect(result.payments[0].lineItems).toEqual([
      { agreementLevelItemId: 1, paymentPence: 6800 }
    ])
    expect(result.payments[0].totalPaymentPence).toBe(6801) // 6800 + 1 penny from missing item
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
        annualPaymentPence: 360
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
    const cmor1ParcelPayment = Math.floor((1060 * 0.34) / 4)
    const cmor1AgreementPayment = Math.floor(27200 / 4)
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
        annualPaymentPence: 360
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
    const cmor1ParcelPayment = Math.floor(1060 * 0.34)
    const cmor1AgreementPayment = Math.floor(27200)
    const upl1ParcelPayment = 2.5 * 2000
    const upl2ParcelPayment = 0.94 * 5300
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
