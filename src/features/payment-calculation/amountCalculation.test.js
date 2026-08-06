import {
  calculateAnnualAndAgreementTotals,
  calculateScheduledPayments,
  createPaymentItems,
  reconcilePaymentAmounts
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

  it('should use each items own duration when calculating the agreement total', () => {
    const parcelItems = {
      1: {
        code: 'CLIG3',
        annualPaymentPence: 109390,
        durationYears: 1
      },
      2: {
        code: 'SCR2',
        annualPaymentPence: 350000,
        durationYears: 3
      }
    }
    const agreementItems = {
      1: {
        code: 'CSAM3',
        annualPaymentPence: 9700,
        durationYears: 1
      }
    }

    const { agreementTotalPence, annualTotalPence } =
      calculateAnnualAndAgreementTotals(parcelItems, agreementItems)

    expect(annualTotalPence).toBe(469090)
    expect(agreementTotalPence).toBe(109390 * 1 + 9700 * 1 + 350000 * 3)
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

  it('should handle action data with null/undefined properties', () => {
    const actionsWithNullProperties = [
      {
        code: null,
        description: null,
        version: 1,
        applicationUnitOfMeasurement: null,
        durationYears: 3,
        payment: {
          ratePerUnitGbp: 10
        }
      }
    ]

    const parcels = [
      {
        sheetId: 'SD5253',
        parcelId: '5484',
        actions: [{ code: null, quantity: 1 }]
      }
    ]

    const { parcelItems } = createPaymentItems(
      parcels,
      actionsWithNullProperties
    )

    expect(parcelItems).toEqual({
      1: {
        code: '',
        description: '',
        version: 1,
        parcelId: '5484',
        durationYears: 3,
        quantity: 1,
        rateInPence: 1000,
        annualPaymentPence: 1000,
        sheetId: 'SD5253',
        unit: ''
      }
    })
  })

  it('should handle empty parcels array', () => {
    const { parcelItems, agreementItems } = createPaymentItems(
      [],
      mockEnabledActions
    )

    expect(parcelItems).toEqual({})
    expect(agreementItems).toEqual({})
  })

  it('should handle undefined actions array gracefully', () => {
    const parcels = [
      {
        sheetId: 'SD5253',
        parcelId: '5484',
        actions: [{ code: 'CMOR1', quantity: 0.34 }]
      }
    ]

    const { parcelItems, agreementItems } = createPaymentItems(
      parcels,
      undefined
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
        durationYears: 1
      },
      2: {
        code: 'CSAM1',
        annualPaymentPence: 870,
        durationYears: 1
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
    // parcelItem 1: (360 * 1) - (4 * 90) = 0 pennies
    // parcelItem 2: (870 * 1) - (4 * 217) = 2 pennies
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
        durationYears: 1
      },
      2: {
        code: 'CSAM1',
        annualPaymentPence: 9700,
        durationYears: 1
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

    // agreementItem 1: (27200 * 1) - (4 * 6800) = 0 pennies
    // agreementItem 2: (9700 * 1) - (4 * 2425) = 0 pennies
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
        durationYears: 1
      }
    }

    const agreementItems = {
      1: {
        code: 'TEST1',
        annualPaymentPence: 555,
        durationYears: 1
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

    // parcelItem 1: (333 * 1) - (4 * 83) = 1 penny
    // agreementItem 1: (555 * 1) - (4 * 138) = 3 pennies
    // Total shifted: 4 pennies
    expect(result.payments[0].lineItems).toEqual([
      { parcelItemId: 1, paymentPence: 84 }, // floor(83.25) + 1 = 83 + 1
      { agreementLevelItemId: 1, paymentPence: 141 } // floor(138.75) + 3 = 138 + 3
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
        durationYears: 1
      },
      2: {
        code: 'ITEM2',
        annualPaymentPence: 222,
        durationYears: 1
      },
      3: {
        code: 'ITEM3',
        annualPaymentPence: 333,
        durationYears: 1
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
      { parcelItemId: 1, paymentPence: 30 }, // floor(27.75) + 3 = 27 + 3
      { parcelItemId: 2, paymentPence: 57 }, // floor(55.5) + 2 = 55 + 2
      { parcelItemId: 3, paymentPence: 84 } // floor(83.25) + 1 = 83 + 1
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

  it('should handle when parcel line item is not found in any payment', () => {
    const parcelItems = {
      1: {
        code: 'CMOR1',
        annualPaymentPence: 360,
        durationYears: 1
      },
      999: {
        code: 'MISSING',
        annualPaymentPence: 111,
        durationYears: 1
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

    // Line item for parcelItemId 999 doesn't exist in any payment
    // item 1: (360 * 1) - (4 * 90) = 0 pennies
    // item 999: (111 * 1) - 0 = 111 pennies (line item not found, so added to total only)
    expect(result.payments[0].lineItems).toEqual([
      { parcelItemId: 1, paymentPence: 90 }
    ])
    expect(result.payments[0].totalPaymentPence).toBe(201) // 90 + 111 pennies from missing item
  })

  it('should handle when agreement line item is not found in any payment', () => {
    const agreementItems = {
      1: {
        code: 'CMOR1',
        annualPaymentPence: 27200,
        durationYears: 1
      },
      999: {
        code: 'MISSING_AGREEMENT',
        annualPaymentPence: 555,
        durationYears: 1
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

    // Line item for agreementLevelItemId 999 doesn't exist in any payment
    // item 1: (27200 * 1) - (4 * 6800) = 0 pennies
    // item 999: (555 * 1) - 0 = 555 pennies (line item not found, so added to total only)
    expect(result.payments[0].lineItems).toEqual([
      { agreementLevelItemId: 1, paymentPence: 6800 }
    ])
    expect(result.payments[0].totalPaymentPence).toBe(7355) // 6800 + 555 pennies from missing item
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

  it('should only include items in payments that fall within their duration', () => {
    const parcelItems = {
      1: {
        code: 'CLIG3',
        annualPaymentPence: 109390,
        durationYears: 1
      },
      2: {
        code: 'SCR2',
        annualPaymentPence: 350000,
        durationYears: 3
      }
    }

    const schedule = [
      '2026-06-15',
      '2026-09-15',
      '2026-12-15',
      '2027-03-15',
      '2027-06-15',
      '2027-09-15',
      '2027-12-15',
      '2028-03-15',
      '2028-06-15',
      '2028-09-15',
      '2028-12-15',
      '2029-03-15'
    ]

    const result = calculateScheduledPayments(parcelItems, {}, schedule)

    // CLIG3 (1 year) is only paid on the first 4 payments
    expect(result[0].lineItems).toEqual([
      { parcelItemId: 1, paymentPence: 27347.5 },
      { parcelItemId: 2, paymentPence: 87500 }
    ])
    expect(result[0].totalPaymentPence).toBe(114847) // floor(27347.5) + floor(87500)

    // SCR2 (3 years) continues to be paid for the rest of the schedule
    expect(result[4].lineItems).toEqual([
      { parcelItemId: 2, paymentPence: 87500 }
    ])
    expect(result[4].totalPaymentPence).toBe(87500)

    expect(result[11].lineItems).toEqual([
      { parcelItemId: 2, paymentPence: 87500 }
    ])
    expect(result[11].totalPaymentPence).toBe(87500)

    // the 1-year item is only present in the first 4 payments
    const paymentsWithClig3 = result.filter((payment) =>
      payment.lineItems.some((lineItem) => lineItem.parcelItemId === 1)
    )
    expect(paymentsWithClig3).toHaveLength(4)
  })
})

describe('reconcilePaymentAmounts - mixed durations', () => {
  it('should shift pennies per item over its own payment window', () => {
    const parcelItems = {
      1: {
        code: 'CLIG3',
        annualPaymentPence: 109390,
        durationYears: 1
      },
      2: {
        code: 'SCR2',
        annualPaymentPence: 350000,
        durationYears: 3
      }
    }

    const payments = [
      {
        lineItems: [
          { parcelItemId: 1, paymentPence: 27347.5 },
          { parcelItemId: 2, paymentPence: 87500 }
        ],
        paymentDate: '2026-06-15',
        totalPaymentPence: 114847
      },
      {
        lineItems: [
          { parcelItemId: 1, paymentPence: 27347.5 },
          { parcelItemId: 2, paymentPence: 87500 }
        ],
        paymentDate: '2026-09-15',
        totalPaymentPence: 114847
      },
      {
        lineItems: [
          { parcelItemId: 1, paymentPence: 27347.5 },
          { parcelItemId: 2, paymentPence: 87500 }
        ],
        paymentDate: '2026-12-15',
        totalPaymentPence: 114847
      },
      {
        lineItems: [
          { parcelItemId: 1, paymentPence: 27347.5 },
          { parcelItemId: 2, paymentPence: 87500 }
        ],
        paymentDate: '2027-03-15',
        totalPaymentPence: 114847
      },
      {
        lineItems: [{ parcelItemId: 2, paymentPence: 87500 }],
        paymentDate: '2027-06-15',
        totalPaymentPence: 87500
      },
      {
        lineItems: [{ parcelItemId: 2, paymentPence: 87500 }],
        paymentDate: '2027-09-15',
        totalPaymentPence: 87500
      },
      {
        lineItems: [{ parcelItemId: 2, paymentPence: 87500 }],
        paymentDate: '2027-12-15',
        totalPaymentPence: 87500
      },
      {
        lineItems: [{ parcelItemId: 2, paymentPence: 87500 }],
        paymentDate: '2028-03-15',
        totalPaymentPence: 87500
      },
      {
        lineItems: [{ parcelItemId: 2, paymentPence: 87500 }],
        paymentDate: '2028-06-15',
        totalPaymentPence: 87500
      },
      {
        lineItems: [{ parcelItemId: 2, paymentPence: 87500 }],
        paymentDate: '2028-09-15',
        totalPaymentPence: 87500
      },
      {
        lineItems: [{ parcelItemId: 2, paymentPence: 87500 }],
        paymentDate: '2028-12-15',
        totalPaymentPence: 87500
      },
      {
        lineItems: [{ parcelItemId: 2, paymentPence: 87500 }],
        paymentDate: '2029-03-15',
        totalPaymentPence: 87500
      }
    ]

    const result = reconcilePaymentAmounts(parcelItems, {}, payments)

    // CLIG3 (1 year): (109390 * 1) - (4 * 27347) = 2 pennies
    // SCR2 (3 years): (350000 * 3) - (12 * 87500) = 0 pennies
    expect(result.payments[0].lineItems).toEqual([
      { parcelItemId: 1, paymentPence: 27349 }, // floor(27347.5) + 2
      { parcelItemId: 2, paymentPence: 87500 }
    ])
    expect(result.payments[0].totalPaymentPence).toBe(114849) // 114847 + 2

    expect(result.payments[1].lineItems).toEqual([
      { parcelItemId: 1, paymentPence: 27347 },
      { parcelItemId: 2, paymentPence: 87500 }
    ])
    expect(result.payments[4].lineItems).toEqual([
      { parcelItemId: 2, paymentPence: 87500 }
    ])

    // Each item's total payments match its own agreement total (annual * duration)
    const clig3Total = result.payments.reduce(
      (acc, payment) =>
        acc +
        (payment.lineItems.find((item) => item.parcelItemId === 1)
          ?.paymentPence ?? 0),
      0
    )
    const scr2Total = result.payments.reduce(
      (acc, payment) =>
        acc +
        (payment.lineItems.find((item) => item.parcelItemId === 2)
          ?.paymentPence ?? 0),
      0
    )
    expect(clig3Total).toBe(109390)
    expect(scr2Total).toBe(1050000)

    // The sum of all scheduled payments equals the agreement total
    const sumOfPayments = result.payments.reduce(
      (acc, payment) => acc + payment.totalPaymentPence,
      0
    )
    expect(sumOfPayments).toBe(clig3Total + scr2Total)
  })
})
