import { actionTransformer } from './parcelActions.transformer.js'

const defaultAction = {
  code: 'ACTION1',
  description: 'Test Action',
  applicationUnitOfMeasurement: 'ha',
  availability: {
    type: 'partial'
  }
}

describe('actionTransformer 2.0.0', () => {
  const linearAction = {
    ...defaultAction,
    code: 'BND1',
    applicationUnitOfMeasurement: 'm'
  }

  test('should transform action with available area', () => {
    const action = { ...defaultAction, semanticVersion: '2.0.0' }
    const availableArea = { availableAreaHectares: 500 }

    const result = actionTransformer(action, availableArea)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availability: {
        unit: 'ha',
        value: 500
      },
      quantityRequired: true,
      isAvailable: true,
      version: '2.0.0'
    })
  })

  test('should transform action without available area when availableArea is null', () => {
    const availableArea = null

    const result = actionTransformer(defaultAction, availableArea)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availability: { unit: 'ha', value: null },
      quantityRequired: true,
      isAvailable: true
    })
  })

  test('should transform action without available area when availableArea is undefined', () => {
    const result = actionTransformer(defaultAction)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availability: { unit: 'ha', value: null },
      quantityRequired: true,
      isAvailable: true
    })
  })

  test.each([['count'], ['m']])(
    'should transform action with units = %s',
    (unit) => {
      const result = actionTransformer(
        { ...defaultAction, applicationUnitOfMeasurement: unit },
        null
      )

      expect(result).toEqual({
        code: 'ACTION1',
        description: 'Test Action',
        availability: { unit, value: null },
        quantityRequired: true,
        isAvailable: true
      })
    }
  )

  test('should transform action with available area when availableAreaHectares is 0', () => {
    const availableArea = {
      availableAreaHectares: 0
    }

    const result = actionTransformer(defaultAction, availableArea)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availability: {
        unit: 'ha',
        value: 0
      },
      quantityRequired: true,
      isAvailable: true
    })
  })

  test('should transform action without available area when availableArea object exists but no availableAreaHectares', () => {
    const availableArea = {
      someOtherProperty: 'value'
    }

    const result = actionTransformer(defaultAction, availableArea)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availability: { unit: 'ha', value: null },
      quantityRequired: true,
      isAvailable: true
    })
  })

  test('should include results when showResults is true', () => {
    const availableArea = {
      availableAreaHectares: 500,
      totalValidLandCoverSqm: 5000000,
      stacks: [{ stack: 'data' }],
      explanations: ['explanation1', 'explanation2']
    }

    const result = actionTransformer(defaultAction, availableArea, true)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availability: {
        unit: 'ha',
        value: 500
      },
      quantityRequired: true,
      isAvailable: true,
      results: {
        totalValidLandCoverSqm: 5000000,
        stacks: [{ stack: 'data' }],
        explanations: ['explanation1', 'explanation2']
      }
    })
  })

  test('should not include results when showResults is false', () => {
    const availableArea = {
      availableAreaHectares: 500,
      totalValidLandCoverSqm: 5000000,
      stacks: [{ stack: 'data' }],
      explanations: ['explanation1', 'explanation2']
    }

    const result = actionTransformer(defaultAction, availableArea, false)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availability: {
        unit: 'ha',
        value: 500
      },
      quantityRequired: true,
      isAvailable: true
    })
  })

  test('should not include availability fields from the action when absent', () => {
    const action = { ...defaultAction, availability: undefined }

    const result = actionTransformer(action)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availability: { unit: 'ha', value: null },
      quantityRequired: true,
      isAvailable: true
    })
  })

  test('should always include guidanceUrl when present', () => {
    const action = { ...defaultAction, guidanceUrl: 'https://example.com' }

    const result = actionTransformer(action)

    expect(result.guidanceUrl).toBe('https://example.com')
  })

  test('should have quantityRequired = false for "total" actions', () => {
    const action = { ...defaultAction, availability: { type: 'total' } }

    const result = actionTransformer(action)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availability: {
        unit: 'ha',
        value: null
      },
      quantityRequired: false,
      isAvailable: true
    })
  })

  test('should transform an sqm (e.g. building) action using availableAreaSqm, not availableAreaHectares', () => {
    const action = {
      ...defaultAction,
      code: 'HEF1',
      applicationUnitOfMeasurement: 'sqm'
    }
    const availableArea = {
      availableAreaSqm: 150,
      availableAreaHectares: 0.015
    }

    const result = actionTransformer(action, availableArea)

    expect(result).toEqual({
      code: 'HEF1',
      description: 'Test Action',
      availability: {
        unit: 'sqm',
        value: 150
      },
      quantityRequired: true,
      isAvailable: true
    })
  })

  test('should transform an sqm action with available area when availableAreaSqm is 0', () => {
    const action = {
      ...defaultAction,
      code: 'HEF1',
      applicationUnitOfMeasurement: 'sqm'
    }
    const availableArea = { availableAreaSqm: 0 }

    const result = actionTransformer(action, availableArea)

    expect(result).toEqual({
      code: 'HEF1',
      description: 'Test Action',
      availability: {
        unit: 'sqm',
        value: 0
      },
      quantityRequired: true,
      isAvailable: true
    })
  })

  test('should include displayUnit and displayUnitPlural where available', () => {
    const action = {
      ...defaultAction,
      displayUnit: 'tomato',
      displayUnitPlural: 'tomatoes'
    }

    const result = actionTransformer(action)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availability: {
        unit: 'ha',
        value: null
      },
      quantityRequired: true,
      isAvailable: true,
      displayUnit: 'tomato',
      displayUnitPlural: 'tomatoes'
    })
  })

  test('should report an action as unavailable when the existing actions do not fit', () => {
    const availableArea = {
      feasible: false,
      availableAreaHectares: 0,
      availableAreaSqm: 0,
      unavailableReason: {
        code: 'existing-actions-do-not-fit',
        reason:
          'Your existing actions do not fit on this land parcel. Please contact the RPA to resolve this.',
        metadata: {
          totalValidLandCoverHa: 4.12,
          existingActionsAreaHa: 5.83,
          existingActions: [{ actionCode: 'CMOR1', areaHa: 3.2 }]
        }
      }
    }

    const result = actionTransformer(defaultAction, availableArea)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availability: { unit: 'ha', value: 0 },
      quantityRequired: true,
      isAvailable: false,
      unavailableReason: {
        code: 'existing-actions-do-not-fit',
        reason:
          'Your existing actions do not fit on this land parcel. Please contact the RPA to resolve this.',
        metadata: {
          totalValidLandCoverHa: 4.12,
          existingActionsAreaHa: 5.83,
          existingActions: [{ actionCode: 'CMOR1', areaHa: 3.2 }]
        }
      }
    })
  })

  test('should still include results for an unavailable action when showResults is true', () => {
    const availableArea = {
      feasible: false,
      availableAreaHectares: 0,
      totalValidLandCoverSqm: 41200,
      existingActionsAreaSqm: 58300,
      explanations: ['why it did not fit']
    }

    const result = actionTransformer(defaultAction, availableArea, true)

    expect(result.results).toEqual({
      totalValidLandCoverSqm: 41200,
      stacks: undefined,
      explanations: ['why it did not fit']
    })
  })

  test('should report the available length for a metre-based action', () => {
    const result = actionTransformer(linearAction, { availableLength: 240 })

    expect(result).toEqual({
      code: 'BND1',
      description: 'Test Action',
      availability: { unit: 'm', value: 240 },
      quantityRequired: true,
      isAvailable: true
    })
  })

  test('should report a metre-based action with no length left as zero, not unrestricted', () => {
    const result = actionTransformer(linearAction, { availableLength: 0 })

    expect(result.availability).toEqual({ unit: 'm', value: 0 })
  })

  test('should not read an area figure for a metre-based action', () => {
    const result = actionTransformer(linearAction, { availableAreaSqm: 5000 })

    expect(result.availability).toEqual({ unit: 'm', value: null })
  })
})
