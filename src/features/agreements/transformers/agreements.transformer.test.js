import * as fx from '~/src/services/dal/fixtures/business.js'
import {
  dbToAgreements,
  dalBusinessToAgreements,
  mergeAgreementsTransformer
} from './agreements.transformer.js'

const defaultDates = {
  startDate: new Date('2020-01-01T00:00:00+01:00'),
  endDate: new Date('2021-01-01T00:00:00+01:00')
}

const defaultDbFields = {
  id: 1,
  parcel_id: fx.PARCEL_ID,
  sheet_id: fx.SHEET_ID,
  ingest_id: 1337,
  ingest_date: '2020-01-01T00:00:00Z',
  actions: []
}

// Default key for grouping agreements, using default parcel + sheet IDs
const key = `${fx.PARCEL_ID}-${fx.SHEET_ID}`

describe('dbToAgreements', () => {
  test('should transform agreements with actions correctly', () => {
    const agreements = [
      {
        ...defaultDbFields,
        actions: [
          {
            actionCode: 'UPL1',
            quantity: 100,
            unit: 'ha',
            startDate: '2025-01-01',
            endDate: '2025-11-31'
          },
          {
            actionCode: 'SPM4',
            quantity: 50,
            unit: 'ha',
            startDate: '2025-01-01',
            endDate: '2025-11-31'
          }
        ]
      }
    ]

    const result = dbToAgreements(agreements)

    expect(result).toEqual({
      [key]: [
        {
          actionCode: 'UPL1',
          quantity: 100,
          unit: 'ha',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-11-31')
        },
        {
          actionCode: 'SPM4',
          quantity: 50,
          unit: 'ha',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-11-31')
        }
      ]
    })
  })

  test('should return an empty object when no agreements were found for any parcel', () => {
    const result = dbToAgreements([])
    expect(result).toEqual({})
  })

  test('should handle agreements with an empty actions array', () => {
    const agreements = [defaultDbFields]
    const result = dbToAgreements(agreements)
    expect(result).toEqual({ [key]: [] })
  })

  test('should group agreements by parcelId + sheetId for multiple parcel results', () => {
    const rows = [
      {
        ...defaultDbFields,
        actions: [
          {
            actionCode: 'BN1',
            quantity: 10,
            unit: 'm',
            startDate: '2020-01-01',
            endDate: '2021-01-01'
          }
        ]
      },
      {
        ...defaultDbFields,
        parcel_id: '0002',
        sheet_id: 'NY0002',
        actions: [
          {
            actionCode: 'BN2',
            quantity: 10,
            unit: 'm',
            startDate: '2020-01-01',
            endDate: '2021-01-01'
          },
          {
            actionCode: 'CLIG3',
            quantity: 100,
            unit: 'ha',
            startDate: '2020-01-01',
            endDate: '2021-01-01'
          }
        ]
      },
      {
        ...defaultDbFields,
        parcel_id: '0003',
        sheet_id: 'NY0003',
        actions: [
          {
            actionCode: 'AF1',
            quantity: 1000,
            unit: 'count',
            startDate: '2020-01-01',
            endDate: '2021-01-01'
          }
        ]
      }
    ]

    const expected = {
      '0001-NY0001': [
        {
          actionCode: 'BN1',
          quantity: 10,
          unit: 'm',
          startDate: new Date('2020-01-01'),
          endDate: new Date('2021-01-01')
        }
      ],
      '0002-NY0002': [
        {
          actionCode: 'BN2',
          quantity: 10,
          unit: 'm',
          startDate: new Date('2020-01-01'),
          endDate: new Date('2021-01-01')
        },
        {
          actionCode: 'CLIG3',
          quantity: 100,
          unit: 'ha',
          startDate: new Date('2020-01-01'),
          endDate: new Date('2021-01-01')
        }
      ],
      '0003-NY0003': [
        {
          actionCode: 'AF1',
          quantity: 1000,
          unit: 'count',
          startDate: new Date('2020-01-01'),
          endDate: new Date('2021-01-01')
        }
      ]
    }
    const actual = dbToAgreements(rows)

    expect(actual).toEqual(expected)
  })
})

describe('mergeAgreementsTransformer', () => {
  test('should merge agreement actions with existing actions', () => {
    const agreementActions = [
      {
        actionCode: 'UPL1',
        quantity: 100,
        unit: 'ha'
      }
    ]

    const plannedActions = [
      {
        actionCode: 'SPM4',
        quantity: 50,
        unit: 'ha'
      }
    ]

    const result = mergeAgreementsTransformer(agreementActions, plannedActions)

    expect(result).toEqual([
      {
        actionCode: 'UPL1',
        quantity: 100,
        unit: 'ha'
      },
      {
        actionCode: 'SPM4',
        quantity: 50,
        unit: 'ha'
      }
    ])
  })

  test('should handle null agreement actions with existing actions', () => {
    const plannedActions = [
      {
        actionCode: 'SPM4',
        quantity: 50,
        unit: 'ha'
      }
    ]

    const result = mergeAgreementsTransformer(null, plannedActions)

    expect(result).toEqual([
      {
        actionCode: 'SPM4',
        quantity: 50,
        unit: 'ha'
      }
    ])
  })

  test('should handle agreement actions with null existing actions', () => {
    const agreementActions = [
      {
        actionCode: 'UPL1',
        quantity: 100,
        unit: 'ha'
      }
    ]

    const result = mergeAgreementsTransformer(agreementActions, null)

    expect(result).toEqual([
      {
        actionCode: 'UPL1',
        quantity: 100,
        unit: 'ha'
      }
    ])
  })

  test('should handle both null agreement actions and existing actions', () => {
    const result = mergeAgreementsTransformer(null, null)
    expect(result).toEqual([])
  })

  test('should handle empty arrays for both parameters', () => {
    const result = mergeAgreementsTransformer([], [])
    expect(result).toEqual([])
  })

  test('should handle undefined agreement actions with existing actions', () => {
    const plannedActions = [
      {
        actionCode: 'SPM4',
        quantity: 50,
        unit: 'ha'
      }
    ]

    const result = mergeAgreementsTransformer(undefined, plannedActions)

    expect(result).toEqual([
      {
        actionCode: 'SPM4',
        quantity: 50,
        unit: 'ha'
      }
    ])
  })

  test('should handle agreement actions with undefined existing actions', () => {
    const agreementActions = [
      {
        actionCode: 'UPL1',
        quantity: 100,
        unit: 'ha'
      }
    ]

    const result = mergeAgreementsTransformer(agreementActions, undefined)

    expect(result).toEqual([
      {
        actionCode: 'UPL1',
        quantity: 100,
        unit: 'ha'
      }
    ])
  })

  test('should merge multiple agreement actions with multiple existing actions', () => {
    const agreementActions = [
      {
        actionCode: 'UPL1',
        quantity: 100,
        unit: 'ha'
      },
      {
        actionCode: 'UPL2',
        quantity: 75,
        unit: 'ha'
      },
      {
        actionCode: 'CMOR1',
        quantity: 25,
        unit: 'ha'
      }
    ]

    const plannedActions = [
      {
        actionCode: 'SPM4',
        quantity: 50,
        unit: 'ha'
      },
      {
        actionCode: 'SPM5',
        quantity: 30,
        unit: 'm'
      }
    ]

    const result = mergeAgreementsTransformer(agreementActions, plannedActions)

    expect(result).toEqual([
      {
        actionCode: 'UPL1',
        quantity: 100,
        unit: 'ha'
      },
      {
        actionCode: 'UPL2',
        quantity: 75,
        unit: 'ha'
      },
      {
        actionCode: 'CMOR1',
        quantity: 25,
        unit: 'ha'
      },
      {
        actionCode: 'SPM4',
        quantity: 50,
        unit: 'ha'
      },
      {
        actionCode: 'SPM5',
        quantity: 30,
        unit: 'm'
      }
    ])
  })
})

describe('dalBusinessToAgreements', () => {
  test('should transform business actions to AgreementActions', () => {
    const expected = {
      [key]: [
        {
          actionCode: 'BN1',
          quantity: 10,
          unit: 'm',
          ...defaultDates
        },
        {
          actionCode: 'BN2',
          quantity: 10,
          unit: 'm',
          ...defaultDates
        },
        {
          actionCode: 'AF1',
          quantity: 1000,
          unit: 'count',
          ...defaultDates
        }
      ]
    }
    const actual = dalBusinessToAgreements(fx.SIMPLE_BUSINESS)

    expect(actual).toEqual(expected)
  })

  test('should transform hectare areas into sqm', () => {
    const expected = {
      [key]: [
        {
          actionCode: 'CLIG3',
          quantity: 1000000,
          unit: 'sqm',
          ...defaultDates
        }
      ]
    }
    const actual = dalBusinessToAgreements(fx.BUSINESS_CLIG3)

    expect(actual).toEqual(expected)
  })

  test('should filter out non-SIGNED agreements', () => {
    const expected = {
      [key]: [
        {
          actionCode: 'AF1',
          quantity: 1000,
          unit: 'count',
          ...defaultDates
        }
      ]
    }
    const actual = dalBusinessToAgreements(fx.BUSINESS_WITH_DRAFTS)

    expect(actual).toEqual(expected)
  })

  test('should group actions by parcelId + sheetId', () => {
    const expected = {
      '0001-NY0001': [
        {
          actionCode: 'BN1',
          quantity: 10,
          unit: 'm',
          ...defaultDates
        }
      ],
      '0002-NY0002': [
        {
          actionCode: 'BN2',
          quantity: 10,
          unit: 'm',
          ...defaultDates
        },
        {
          actionCode: 'CLIG3',
          quantity: 1000000,
          unit: 'sqm',
          ...defaultDates
        }
      ],
      '0003-NY0003': [
        {
          actionCode: 'AF1',
          quantity: 1000,
          unit: 'count',
          ...defaultDates
        }
      ]
    }
    const actual = dalBusinessToAgreements(fx.BUSINESS_WITH_MULTIPLE_PARCELS)

    expect(actual).toEqual(expected)
  })

  test('should filter out actions with capital grants (no quantity specified at all)', () => {
    const expected = {
      [key]: [
        {
          actionCode: 'BN1',
          quantity: 10,
          unit: 'm',
          ...defaultDates
        },
        {
          actionCode: 'AF1',
          quantity: 1000,
          unit: 'count',
          ...defaultDates
        }
      ]
    }
    const actual = dalBusinessToAgreements(fx.BUSINESS_WITH_CAPITAL_GRANTS)

    expect(actual).toEqual(expected)
  })
})
