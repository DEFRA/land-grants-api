import { actionTransformer } from './parcelActions.transformer.js'

describe('actionTransformer 2.0.0', () => {
  test('should transform action with available area', () => {
    const action = {
      code: 'ACTION1',
      description: 'Test Action',
      semanticVersion: '2.0.0'
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
      },
      version: '2.0.0'
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

  test('should include availability when showAvailability is true', () => {
    const action = {
      code: 'ACTION1',
      description: 'Test Action',
      guidanceUrl: 'https://example.com',
      availability: { type: 'total' }
    }

    const result = actionTransformer(action, null, false, true)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availableArea: undefined,
      guidanceUrl: 'https://example.com',
      availability: { type: 'total' }
    })
  })

  test('should not include availability when showAvailability is false', () => {
    const action = {
      code: 'ACTION1',
      description: 'Test Action',
      guidanceUrl: 'https://example.com',
      availability: { type: 'total' }
    }

    const result = actionTransformer(action, null, false, false)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availableArea: undefined,
      guidanceUrl: 'https://example.com'
    })
  })

  test('should default showAvailability to false when omitted', () => {
    const action = {
      code: 'ACTION1',
      description: 'Test Action',
      guidanceUrl: 'https://example.com',
      availability: { type: 'total' }
    }

    const result = actionTransformer(action)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availableArea: undefined,
      guidanceUrl: 'https://example.com'
    })
  })

  test('should not include availability when showAvailability is true but action has none', () => {
    const action = {
      code: 'ACTION1',
      description: 'Test Action'
    }

    const result = actionTransformer(action, null, false, true)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availableArea: undefined
    })
  })

  test('should always include guidanceUrl regardless of showAvailability', () => {
    const action = {
      code: 'ACTION1',
      description: 'Test Action',
      guidanceUrl: 'https://example.com'
    }

    const result = actionTransformer(action, null, false, false)

    expect(result.guidanceUrl).toBe('https://example.com')
  })
})
