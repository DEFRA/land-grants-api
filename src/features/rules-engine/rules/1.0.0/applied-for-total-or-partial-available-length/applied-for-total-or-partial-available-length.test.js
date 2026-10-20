import { appliedForTotalOrPartialAvailableLength } from './applied-for-total-or-partial-available-length.js'

describe('appliedForTotalOrPartialAvailableLength', () => {
  const createApplication = (appliedForQuantity, availability) => ({
    appliedForQuantity,
    landParcel: {
      availability
    }
  })

  const createRule = (
    name = 'applied-for-total-or-partial-available-length',
    description = 'Is the applied for length no more than the available length?'
  ) => ({
    name,
    description
  })

  test('should pass when applied for length matches the available length', () => {
    const application = createApplication(100, 100)
    const rule = createRule()
    const result = appliedForTotalOrPartialAvailableLength.execute(
      application,
      rule
    )

    expect(result).toEqual({
      name: 'applied-for-total-or-partial-available-length',
      passed: true,
      description: rule.description,
      reason:
        'The applied for length (100 m) is no more than the available length (100 m)',
      explanations: [
        {
          title: 'Total or partial available length',
          lines: [
            'The available boundary length was (100 m) the applicant applied for (100 m)'
          ]
        }
      ]
    })
  })

  test('should pass when applied for length is less than the available length', () => {
    const application = createApplication(50, 100)
    const rule = createRule()
    const result = appliedForTotalOrPartialAvailableLength.execute(
      application,
      rule
    )

    expect(result.passed).toBe(true)
  })

  test('should fail when applied for length is greater than the available length', () => {
    const application = createApplication(150, 100)
    const rule = createRule()
    const result = appliedForTotalOrPartialAvailableLength.execute(
      application,
      rule
    )

    expect(result).toEqual({
      name: 'applied-for-total-or-partial-available-length',
      passed: false,
      description: rule.description,
      reason:
        'Enter a value that is no more than the available length for this land parcel 100 m',
      explanations: [
        {
          title: 'Total or partial available length',
          lines: [
            'The available boundary length was (100 m) the applicant applied for (150 m)'
          ]
        }
      ]
    })
  })

  test('should use the rule name and description passed in', () => {
    const application = createApplication(100, 100)
    const rule = createRule('custom-rule-name', 'Custom description')
    const result = appliedForTotalOrPartialAvailableLength.execute(
      application,
      rule
    )

    expect(result.name).toBe('custom-rule-name')
    expect(result.description).toBe('Custom description')
  })
})
