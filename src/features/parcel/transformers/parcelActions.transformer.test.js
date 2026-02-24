import {
  actionTransformer,
  parcelTransformer,
  parcelActionsTransformer,
  plannedActionsTransformer,
  sizeTransformer,
  sssiConsentRequiredActionTransformer,
  heferRequiredActionTransformer
} from './parcelActions.transformer.js'

describe('sizeTransformer', () => {
  test('should transform area to correct format', () => {
    const area = 1000
    const result = sizeTransformer(area)

    expect(result).toEqual({
      unit: 'ha',
      value: 1000
    })
  })
})

describe('actionTransformer', () => {
  test('should transform action with available area', () => {
    const action = {
      code: 'ACTION1',
      description: 'Test Action'
    }
    const availableArea = {
      availableAreaHectares: 500
    }

    const result = actionTransformer(action, availableArea)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availableArea: {
        unit: 'ha',
        value: 500
      }
    })
  })

  test('should transform action without available area when availableArea is null', () => {
    const action = {
      code: 'ACTION1',
      description: 'Test Action'
    }
    const availableArea = null

    const result = actionTransformer(action, availableArea)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availableArea: undefined
    })
  })

  test('should transform action without available area when availableArea is undefined', () => {
    const action = {
      code: 'ACTION1',
      description: 'Test Action'
    }

    const result = actionTransformer(action)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availableArea: undefined
    })
  })

  test('should transform action with available area when availableAreaHectares is 0', () => {
    const action = {
      code: 'ACTION1',
      description: 'Test Action'
    }
    const availableArea = {
      availableAreaHectares: 0
    }

    const result = actionTransformer(action, availableArea)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availableArea: {
        unit: 'ha',
        value: 0
      }
    })
  })

  test('should transform action without available area when availableArea object exists but no availableAreaHectares', () => {
    const action = {
      code: 'ACTION1',
      description: 'Test Action'
    }
    const availableArea = {
      someOtherProperty: 'value'
    }

    const result = actionTransformer(action, availableArea)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availableArea: undefined
    })
  })

  test('should include results when showResults is true', () => {
    const action = {
      code: 'ACTION1',
      description: 'Test Action'
    }
    const availableArea = {
      availableAreaHectares: 500,
      totalValidLandCoverSqm: 5000000,
      stacks: [{ stack: 'data' }],
      explanations: ['explanation1', 'explanation2']
    }

    const result = actionTransformer(action, availableArea, true)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availableArea: {
        unit: 'ha',
        value: 500
      },
      results: {
        totalValidLandCoverSqm: 5000000,
        stacks: [{ stack: 'data' }],
        explanations: ['explanation1', 'explanation2']
      }
    })
  })

  test('should not include results when showResults is false', () => {
    const action = {
      code: 'ACTION1',
      description: 'Test Action'
    }
    const availableArea = {
      availableAreaHectares: 500,
      totalValidLandCoverSqm: 5000000,
      stacks: [{ stack: 'data' }],
      explanations: ['explanation1', 'explanation2']
    }

    const result = actionTransformer(action, availableArea, false)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availableArea: {
        unit: 'ha',
        value: 500
      }
    })
  })
})

describe('parcelTransformer', () => {
  test('should transform land parcel with actions', () => {
    const landParcel = {
      parcel_id: 'P123',
      sheet_id: 'S456',
      area_sqm: 2000
    }
    const actions = [
      {
        code: 'ACTION1',
        description: 'Test Action 1',
        availableArea: {
          unit: 'ha',
          value: 1000
        }
      }
    ]

    const result = parcelTransformer(landParcel, actions)

    expect(result).toEqual({
      parcel: {
        parcelId: 'P123',
        sheetId: 'S456',
        size: {
          unit: 'ha',
          value: 2000
        },
        actions
      }
    })
  })

  test('should handle null parcel_id and sheet_id', () => {
    const landParcel = {
      parcel_id: null,
      sheet_id: null,
      area_sqm: 2000
    }
    const actions = []

    const result = parcelTransformer(landParcel, actions)

    expect(result).toEqual({
      parcel: {
        parcelId: null,
        sheetId: null,
        size: {
          unit: 'ha',
          value: 2000
        },
        actions: []
      }
    })
  })
})

describe('parcelActionsTransformer', () => {
  test('should transform land parcel with actions using spread operator', () => {
    const landParcel = {
      parcel_id: 'P123',
      sheet_id: 'S456',
      area_sqm: 2000
    }
    const actions = [
      {
        code: 'ACTION1',
        description: 'Test Action 1',
        availableArea: {
          unit: 'ha',
          value: 1000
        }
      }
    ]

    const result = parcelActionsTransformer(landParcel, actions)

    expect(result).toEqual({
      parcelId: 'P123',
      sheetId: 'S456',
      size: {
        unit: 'ha',
        value: 2000
      },
      actions
    })
  })

  test('should handle empty actions array', () => {
    const landParcel = {
      parcel_id: 'P123',
      sheet_id: 'S456',
      area_sqm: 2000
    }
    const actions = []

    const result = parcelActionsTransformer(landParcel, actions)

    expect(result).toEqual({
      parcelId: 'P123',
      sheetId: 'S456',
      size: {
        unit: 'ha',
        value: 2000
      },
      actions: []
    })
  })
})

describe('plannedActionsTransformer', () => {
  test('should transform current actions to actions with area in square meters', () => {
    const plannedActions = [
      { actionCode: 'UPL1', quantity: 0.00001, unit: 'ha' }
    ]

    const result = plannedActionsTransformer(plannedActions)

    expect(result).toEqual([{ actionCode: 'UPL1', areaSqm: 0.1 }])
  })

  test('should return empty array when plannedActions is null', () => {
    const plannedActions = null

    const result = plannedActionsTransformer(plannedActions)

    expect(result).toEqual([])
  })
})

describe('sssiConsentRequiredActionTransformer', () => {
  test('should add sssiConsentRequired property to actions based on action code', () => {
    const responseParcels = [
      {
        parcelId: 'P123',
        sheetId: 'S456',
        actions: [
          { code: 'ACTION1', description: 'Action 1' },
          { code: 'ACTION2', description: 'Action 2' }
        ]
      }
    ]
    const sssiConsentRequiredAction = {
      ACTION1: { caveat: { metadata: { percentageOverlap: 10 } } },
      ACTION2: {}
    }

    const result = sssiConsentRequiredActionTransformer(
      responseParcels,
      sssiConsentRequiredAction
    )

    expect(result).toEqual([
      {
        parcelId: 'P123',
        sheetId: 'S456',
        actions: [
          {
            code: 'ACTION1',
            description: 'Action 1',
            sssiConsentRequired: true
          },
          {
            code: 'ACTION2',
            description: 'Action 2',
            sssiConsentRequired: false
          }
        ]
      }
    ])
  })

  test('should handle multiple parcels with multiple actions', () => {
    const responseParcels = [
      {
        parcelId: 'P123',
        sheetId: 'S456',
        actions: [
          { code: 'ACTION1', description: 'Action 1' },
          { code: 'ACTION2', description: 'Action 2' }
        ]
      },
      {
        parcelId: 'P789',
        sheetId: 'S012',
        actions: [
          { code: 'ACTION3', description: 'Action 3' },
          { code: 'ACTION1', description: 'Action 1' }
        ]
      }
    ]
    const sssiConsentRequiredAction = {
      ACTION1: { caveat: { metadata: { percentageOverlap: 10 } } },
      ACTION2: {},
      ACTION3: { caveat: { metadata: { percentageOverlap: 15 } } }
    }

    const result = sssiConsentRequiredActionTransformer(
      responseParcels,
      sssiConsentRequiredAction
    )

    expect(result).toEqual([
      {
        parcelId: 'P123',
        sheetId: 'S456',
        actions: [
          {
            code: 'ACTION1',
            description: 'Action 1',
            sssiConsentRequired: true
          },
          {
            code: 'ACTION2',
            description: 'Action 2',
            sssiConsentRequired: false
          }
        ]
      },
      {
        parcelId: 'P789',
        sheetId: 'S012',
        actions: [
          {
            code: 'ACTION3',
            description: 'Action 3',
            sssiConsentRequired: true
          },
          {
            code: 'ACTION1',
            description: 'Action 1',
            sssiConsentRequired: true
          }
        ]
      }
    ])
  })

  test('should set sssiConsentRequired to false when action code is not in map', () => {
    const responseParcels = [
      {
        parcelId: 'P123',
        sheetId: 'S456',
        actions: [
          { code: 'ACTION1', description: 'Action 1' },
          { code: 'ACTION2', description: 'Action 2' }
        ]
      }
    ]
    const sssiConsentRequiredAction = {
      ACTION1: { caveat: { metadata: { percentageOverlap: 10 } } }
    }

    const result = sssiConsentRequiredActionTransformer(
      responseParcels,
      sssiConsentRequiredAction
    )

    expect(result).toEqual([
      {
        parcelId: 'P123',
        sheetId: 'S456',
        actions: [
          {
            code: 'ACTION1',
            description: 'Action 1',
            sssiConsentRequired: true
          },
          {
            code: 'ACTION2',
            description: 'Action 2',
            sssiConsentRequired: false
          }
        ]
      }
    ])
  })

  test('should handle empty actions array', () => {
    const responseParcels = [
      {
        parcelId: 'P123',
        sheetId: 'S456',
        actions: []
      }
    ]
    const sssiConsentRequiredAction = {
      ACTION1: { caveat: { metadata: { percentageOverlap: 10 } } }
    }

    const result = sssiConsentRequiredActionTransformer(
      responseParcels,
      sssiConsentRequiredAction
    )

    expect(result).toEqual([
      {
        parcelId: 'P123',
        sheetId: 'S456',
        actions: []
      }
    ])
  })

  test('should handle empty parcels array', () => {
    const responseParcels = []
    const sssiConsentRequiredAction = {
      ACTION1: { caveat: { metadata: { percentageOverlap: 10 } } }
    }

    const result = sssiConsentRequiredActionTransformer(
      responseParcels,
      sssiConsentRequiredAction
    )

    expect(result).toEqual([])
  })

  test('should handle empty sssiConsentRequiredAction map', () => {
    const responseParcels = [
      {
        parcelId: 'P123',
        sheetId: 'S456',
        actions: [
          { code: 'ACTION1', description: 'Action 1' },
          { code: 'ACTION2', description: 'Action 2' }
        ]
      }
    ]
    const sssiConsentRequiredAction = {}

    const result = sssiConsentRequiredActionTransformer(
      responseParcels,
      sssiConsentRequiredAction
    )

    expect(result).toEqual([
      {
        parcelId: 'P123',
        sheetId: 'S456',
        actions: [
          {
            code: 'ACTION1',
            description: 'Action 1',
            sssiConsentRequired: false
          },
          {
            code: 'ACTION2',
            description: 'Action 2',
            sssiConsentRequired: false
          }
        ]
      }
    ])
  })
})

describe('heferRequiredActionTransformer', () => {
  test('should add heferRequired property to actions based on action code', () => {
    const responseParcels = [
      {
        parcelId: 'P123',
        sheetId: 'S456',
        actions: [
          { code: 'ACTION1', description: 'Action 1' },
          { code: 'ACTION2', description: 'Action 2' }
        ]
      }
    ]
    const heferRequiredAction = {
      ACTION1: { caveat: { metadata: { percentageOverlap: 10 } } },
      ACTION2: {}
    }

    const result = heferRequiredActionTransformer(
      responseParcels,
      heferRequiredAction
    )

    expect(result).toEqual([
      {
        parcelId: 'P123',
        sheetId: 'S456',
        actions: [
          {
            code: 'ACTION1',
            description: 'Action 1',
            heferRequired: true
          },
          {
            code: 'ACTION2',
            description: 'Action 2',
            heferRequired: false
          }
        ]
      }
    ])
  })

  test('should handle multiple parcels with multiple actions', () => {
    const responseParcels = [
      {
        parcelId: 'P123',
        sheetId: 'S456',
        actions: [
          { code: 'ACTION1', description: 'Action 1' },
          { code: 'ACTION2', description: 'Action 2' }
        ]
      },
      {
        parcelId: 'P789',
        sheetId: 'S012',
        actions: [
          { code: 'ACTION3', description: 'Action 3' },
          { code: 'ACTION1', description: 'Action 1' }
        ]
      }
    ]
    const heferRequiredAction = {
      ACTION1: { caveat: { metadata: { percentageOverlap: 10 } } },
      ACTION2: {},
      ACTION3: { caveat: { metadata: { percentageOverlap: 15 } } }
    }

    const result = heferRequiredActionTransformer(
      responseParcels,
      heferRequiredAction
    )

    expect(result).toEqual([
      {
        parcelId: 'P123',
        sheetId: 'S456',
        actions: [
          {
            code: 'ACTION1',
            description: 'Action 1',
            heferRequired: true
          },
          {
            code: 'ACTION2',
            description: 'Action 2',
            heferRequired: false
          }
        ]
      },
      {
        parcelId: 'P789',
        sheetId: 'S012',
        actions: [
          {
            code: 'ACTION3',
            description: 'Action 3',
            heferRequired: true
          },
          {
            code: 'ACTION1',
            description: 'Action 1',
            heferRequired: true
          }
        ]
      }
    ])
  })

  test('should set heferRequired to false when action code is not in map', () => {
    const responseParcels = [
      {
        parcelId: 'P123',
        sheetId: 'S456',
        actions: [
          { code: 'ACTION1', description: 'Action 1' },
          { code: 'ACTION2', description: 'Action 2' }
        ]
      }
    ]
    const heferRequiredAction = {
      ACTION1: { caveat: { metadata: { percentageOverlap: 10 } } }
    }

    const result = heferRequiredActionTransformer(
      responseParcels,
      heferRequiredAction
    )

    expect(result).toEqual([
      {
        parcelId: 'P123',
        sheetId: 'S456',
        actions: [
          {
            code: 'ACTION1',
            description: 'Action 1',
            heferRequired: true
          },
          {
            code: 'ACTION2',
            description: 'Action 2',
            heferRequired: false
          }
        ]
      }
    ])
  })

  test('should handle empty actions array', () => {
    const responseParcels = [
      {
        parcelId: 'P123',
        sheetId: 'S456',
        actions: []
      }
    ]
    const heferRequiredAction = {
      ACTION1: { caveat: { metadata: { percentageOverlap: 10 } } }
    }

    const result = heferRequiredActionTransformer(
      responseParcels,
      heferRequiredAction
    )

    expect(result).toEqual([
      {
        parcelId: 'P123',
        sheetId: 'S456',
        actions: []
      }
    ])
  })

  test('should handle empty parcels array', () => {
    const responseParcels = []
    const heferRequiredAction = {
      ACTION1: { caveat: { metadata: { percentageOverlap: 10 } } }
    }

    const result = heferRequiredActionTransformer(
      responseParcels,
      heferRequiredAction
    )

    expect(result).toEqual([])
  })

  test('should handle empty heferRequiredAction map', () => {
    const responseParcels = [
      {
        parcelId: 'P123',
        sheetId: 'S456',
        actions: [
          { code: 'ACTION1', description: 'Action 1' },
          { code: 'ACTION2', description: 'Action 2' }
        ]
      }
    ]
    const heferRequiredAction = {}

    const result = heferRequiredActionTransformer(
      responseParcels,
      heferRequiredAction
    )

    expect(result).toEqual([
      {
        parcelId: 'P123',
        sheetId: 'S456',
        actions: [
          {
            code: 'ACTION1',
            description: 'Action 1',
            heferRequired: false
          },
          {
            code: 'ACTION2',
            description: 'Action 2',
            heferRequired: false
          }
        ]
      }
    ])
  })

  test('should return responseParcels when responseParcels is null', () => {
    const heferRequiredAction = {
      ACTION1: { caveat: { metadata: { percentageOverlap: 10 } } }
    }

    const result = heferRequiredActionTransformer(null, heferRequiredAction)

    expect(result).toBeNull()
  })

  test('should return responseParcels when heferRequiredAction is null', () => {
    const responseParcels = [
      {
        parcelId: 'P123',
        sheetId: 'S456',
        actions: [{ code: 'ACTION1', description: 'Action 1' }]
      }
    ]

    const result = heferRequiredActionTransformer(responseParcels, null)

    expect(result).toEqual(responseParcels)
  })
})
