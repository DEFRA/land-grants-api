import * as fx from '~/src/services/dal/fixtures/business.js'
import {
  agreementActionsTransformer,
  dalBusinessToAgreements,
  mergeAgreementsTransformer
} from './agreements.transformer.js'

const defaultDates = {
  startDate: new Date('2020-01-01T00:00:00+01:00'),
  endDate: new Date('2021-01-01T00:00:00+01:00')
}

describe('agreementActionsTransformer', () => {
  test('should transform agreements with actions correctly', () => {
    const agreements = [
      {
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

    const result = agreementActionsTransformer(agreements)

    expect(result).toEqual([
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
    ])
  })

  test('should return empty array when agreements is null', () => {
    const result = agreementActionsTransformer(null)
    expect(result).toEqual([])
  })

  test('should return empty array when agreements is undefined', () => {
    const result = agreementActionsTransformer(undefined)
    expect(result).toEqual([])
  })

  test('should return empty array when agreements is empty array', () => {
    const result = agreementActionsTransformer([])
    expect(result).toEqual([])
  })

  test('should handle agreement with empty actions array', () => {
    const agreements = [
      {
        actions: []
      }
    ]

    const result = agreementActionsTransformer(agreements)
    expect(result).toEqual([])
  })

  test('should handle multiple agreements with some having no actions', () => {
    const agreements = [
      {
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

    const result = agreementActionsTransformer(agreements)

    expect(result).toEqual([
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
    ])
  })

  test('should handle action with zero quantity', () => {
    const agreements = [
      {
        actions: [
          {
            actionCode: 'UPL1',
            quantity: 0,
            unit: 'ha',
            startDate: '2025-01-01',
            endDate: '2025-11-31'
          }
        ]
      }
    ]

    const result = agreementActionsTransformer(agreements)

    expect(result).toEqual([
      {
        actionCode: 'UPL1',
        quantity: 0,
        unit: 'ha',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-11-31')
      }
    ])
  })

  test('should handle action with different unit types', () => {
    const agreements = [
      {
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
            quantity: 200,
            unit: 'm',
            startDate: '2025-01-01',
            endDate: '2025-11-31'
          },
          {
            actionCode: 'CMOR1',
            quantity: 15,
            unit: 'km',
            startDate: '2025-01-01',
            endDate: '2025-11-31'
          }
        ]
      }
    ]

    const result = agreementActionsTransformer(agreements)

    expect(result).toEqual([
      {
        actionCode: 'UPL1',
        quantity: 100,
        unit: 'ha',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-11-31')
      },
      {
        actionCode: 'SPM4',
        quantity: 200,
        unit: 'm',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-11-31')
      },
      {
        actionCode: 'CMOR1',
        quantity: 15,
        unit: 'km',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-11-31')
      }
    ])
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
  test('should transform a business actions to AgreementActions', () => {
    const expected = [
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
    const actual = dalBusinessToAgreements(
      fx.SIMPLE_BUSINESS,
      fx.PARCEL_ID,
      fx.SHEET_ID
    )

    expect(actual).toEqual(expected)
  })

  test('should transform hectare areas into sqm', () => {
    const expected = [
      {
        actionCode: 'CLIG3',
        quantity: 1000000,
        unit: 'sqm',
        ...defaultDates
      }
    ]
    const actual = dalBusinessToAgreements(
      fx.BUSINESS_CLIG3,
      fx.PARCEL_ID,
      fx.SHEET_ID
    )

    expect(actual).toEqual(expected)
  })

  test('should filter out non-SIGNED agreements', () => {
    const expected = [
      {
        actionCode: 'AF1',
        quantity: 1000,
        unit: 'count',
        ...defaultDates
      }
    ]
    const actual = dalBusinessToAgreements(
      fx.BUSINESS_WITH_DRAFTS,
      fx.PARCEL_ID,
      fx.SHEET_ID
    )

    expect(actual).toEqual(expected)
  })

  test('should filter resulting actions by parcelId and sheetName', () => {
    const expected = [
      {
        actionCode: 'BN1',
        quantity: 10,
        unit: 'm',
        ...defaultDates
      }
    ]
    const actual = dalBusinessToAgreements(
      fx.BUSINESS_WITH_MULTIPLE_PARCELS,
      fx.PARCEL_ID,
      fx.SHEET_ID
    )

    expect(actual).toEqual(expected)
  })

  test('should filter out actions with capital grants (no quantity specified at all)', () => {
    const expected = [
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
    const actual = dalBusinessToAgreements(
      fx.BUSINESS_WITH_CAPITAL_GRANTS,
      fx.PARCEL_ID,
      fx.SHEET_ID
    )

    expect(actual).toEqual(expected)
  })
})
