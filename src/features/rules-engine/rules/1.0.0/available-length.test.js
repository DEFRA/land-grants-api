import { appliedForAvailableLength } from './available-length.js'

describe('appliedForAvailableLength', () => {
  const createApplication = (appliedForQuantity, availability) => ({
    appliedForQuantity,
    landParcel: {
      availability
    }
  })

  const createRule = (
    name = 'available-length',
    description = 'Check the applied for length matches the available length'
  ) => ({
    name,
    description
  })

  test('should pass when applied for length matches the available length', () => {
    const application = createApplication(100, 100)
    const rule = createRule()
    const result = appliedForAvailableLength.execute(application, rule)

    expect(result).toEqual({
      name: 'available-length',
      passed: true,
      description: rule.description,
      reason: 'Parcel length matches the applied for length',
      explanations: [
        {
          title: 'Total available boundary length',
          lines: [
            'The available boundary length was (100 m) the applicant applied for (100 m)'
          ]
        }
      ]
    })
  })

  test('should fail when applied for length is greater than the available length', () => {
    const application = createApplication(150, 100)
    const rule = createRule()
    const result = appliedForAvailableLength.execute(application, rule)

    expect(result).toEqual({
      name: 'available-length',
      passed: false,
      description: rule.description,
      reason:
        'Enter a value that is no more than the available length for this land parcel 100 m',
      explanations: [
        {
          title: 'Total available boundary length',
          lines: [
            'The available boundary length was (100 m) the applicant applied for (150 m)'
          ]
        }
      ]
    })
  })

  test('should fail when applied for length is less than the available length', () => {
    const application = createApplication(50, 100)
    const rule = createRule()
    const result = appliedForAvailableLength.execute(application, rule)

    expect(result).toEqual({
      name: 'available-length',
      passed: false,
      description: rule.description,
      reason:
        'Enter a value that is no less than the available length for this land parcel 100 m',
      explanations: [
        {
          title: 'Total available boundary length',
          lines: [
            'The available boundary length was (100 m) the applicant applied for (50 m)'
          ]
        }
      ]
    })
  })

  test('should use the rule name and description passed in', () => {
    const application = createApplication(100, 100)
    const rule = createRule('custom-rule-name', 'Custom description')
    const result = appliedForAvailableLength.execute(application, rule)

    expect(result.name).toBe('custom-rule-name')
    expect(result.description).toBe('Custom description')
  })
})
