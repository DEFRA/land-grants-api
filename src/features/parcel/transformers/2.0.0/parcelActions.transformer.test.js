import { actionTransformer } from './parcelActions.transformer.js'

const defaultAction = {
  code: 'ACTION1',
  description: 'Test Action',
  applicationUnitOfMeasurement: 'ha'
}

describe('actionTransformer 2.0.0', () => {
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
      version: '2.0.0'
    })
  })

  test('should transform action without available area when availableArea is null', () => {
    const availableArea = null

    const result = actionTransformer(defaultAction, availableArea)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availability: { unit: 'ha', value: null }
    })
  })

  test('should transform action without available area when availableArea is undefined', () => {
    const result = actionTransformer(defaultAction)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availability: { unit: 'ha', value: null }
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
        availability: { unit, value: null }
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
      }
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
      availability: { unit: 'ha', value: null }
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
      }
    })
  })

  test('should always include availability when present', () => {
    const action = {
      ...defaultAction,
      guidanceUrl: 'https://example.com',
      availability: { type: 'total' }
    }

    const result = actionTransformer(action)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      guidanceUrl: 'https://example.com',
      availability: { unit: 'ha', value: null, type: 'total' }
    })
  })

  test('should not include availability fields from the action when absent', () => {
    const action = { ...defaultAction, availability: undefined }

    const result = actionTransformer(action)

    expect(result).toEqual({
      code: 'ACTION1',
      description: 'Test Action',
      availability: { unit: 'ha', value: null }
    })
  })

  test('should always include guidanceUrl when present', () => {
    const action = { ...defaultAction, guidanceUrl: 'https://example.com' }

    const result = actionTransformer(action)

    expect(result.guidanceUrl).toBe('https://example.com')
  })
})
