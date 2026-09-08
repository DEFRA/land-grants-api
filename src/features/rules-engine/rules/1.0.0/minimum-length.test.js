import { minimumLength } from './minimum-length.js'

describe('minimumLength', () => {
  const name = 'minimum-length'

  const createApplication = (appliedForQuantity, availability) => ({
    appliedForQuantity,
    landParcel: {
      availability
    }
  })

  const createRule = (config = { minimumLengthM: 20 }) => ({
    name,
    description: 'Check the applied for length meets the configured minimum',
    config
  })

  test('should fail when the applied for length is below the configured minimum', () => {
    const result = minimumLength.execute(
      createApplication(15, 300),
      createRule()
    )

    expect(result.passed).toBe(false)
    expect(result.reason).toEqual(
      'Enter a value that is no less than the minimum length for this action 20 m'
    )
  })

  test('should fail when the configured minimum exceeds the available length', () => {
    const result = minimumLength.execute(
      createApplication(20, 10),
      createRule()
    )

    expect(result.passed).toBe(false)
    expect(result.reason).toEqual(
      'The minimum allowable length for this action (20 m) is more than the available length for this land parcel (10 m)'
    )
  })

  test('should fail when the applied for length is above the available length', () => {
    const result = minimumLength.execute(
      createApplication(350, 300),
      createRule()
    )

    expect(result.passed).toBe(false)
    expect(result.reason).toEqual(
      'Enter a value that is no more than the available length for this land parcel 300 m'
    )
  })

  test('should pass when the applied for length equals the configured minimum', () => {
    const result = minimumLength.execute(
      createApplication(20, 300),
      createRule()
    )

    expect(result.passed).toBe(true)
    expect(result.reason).toEqual(
      'The applied for length meets the minimum allowable length for this action'
    )
  })

  test('should pass when the applied for length is between the minimum and the available length', () => {
    const result = minimumLength.execute(
      createApplication(50, 300),
      createRule()
    )

    expect(result.passed).toBe(true)
  })

  test('should pass when the applied for length equals the available length', () => {
    const result = minimumLength.execute(
      createApplication(300, 300),
      createRule()
    )

    expect(result.passed).toBe(true)
  })

  test('should fail when the rule is missing config for the minimum length', () => {
    const result = minimumLength.execute(createApplication(50, 300), {
      name,
      description: 'Check the applied for length meets the configured minimum'
    })

    expect(result.passed).toBe(false)
    expect(result.reason).toEqual('Missing config for minimum length')
    expect(result.explanations).toEqual([
      {
        title: 'Minimum length',
        lines: ['No minimum allowable length is configured for this action']
      }
    ])
  })

  test('should fail when the available length is zero', () => {
    const result = minimumLength.execute(createApplication(20, 0), createRule())

    expect(result.passed).toBe(false)
    expect(result.reason).toEqual(
      'The minimum allowable length for this action (20 m) is more than the available length for this land parcel (0 m)'
    )
  })

  test('should explain the minimum, the available length and the applied for length', () => {
    const result = minimumLength.execute(
      createApplication(50, 300),
      createRule()
    )

    expect(result.explanations).toEqual([
      {
        title: 'Minimum length',
        lines: [
          'The minimum allowable length is (20 m), the available length was (300 m) and the applicant applied for (50 m)'
        ]
      }
    ])
  })

  test('should use the rule name and description passed in', () => {
    const result = minimumLength.execute(createApplication(50, 300), {
      name: 'custom-rule-name',
      description: 'Custom description',
      config: { minimumLengthM: 20 }
    })

    expect(result.name).toBe('custom-rule-name')
    expect(result.description).toBe('Custom description')
  })
})
