import { woodlandMinimumEligibility } from './woodland-minimum-eligibility.js'

const ruleDescription =
  'Is the parcel eligible for the woodland management plan action?'

describe('woodlandMinimumEligibility', () => {
  const createApplication = (oldWoodlandAreaHa, newWoodlandAreaHa = 0) => ({
    oldWoodlandAreaHa,
    newWoodlandAreaHa
  })

  const createRule = (name = 'woodland-minimum-eligibility') => ({
    name,
    config: {
      minimumSize: 0.5,
      minOldWoodlandPercent: 80
    },
    description: ruleDescription
  })

  test('should pass when woodland area over 10 years meets the minimum of 0.5ha exactly', () => {
    const application = createApplication(0.5)
    const rule = createRule()
    const result = woodlandMinimumEligibility.execute(application, rule)

    expect(result).toEqual({
      name: 'woodland-minimum-eligibility',
      passed: true,
      reason:
        'The total woodland area (0.5 ha) meets the minimum required area of (0.5 ha)',
      description: ruleDescription,
      explanations: [
        {
          title: 'Woodland minimum eligibility',
          lines: [
            'The minimum required woodland area over 10 years old is (0.5 ha), the holding has (0.5 ha)'
          ]
        }
      ]
    })
  })

  test('should pass when woodland area over 10 years exceeds the minimum of 0.5ha', () => {
    const application = createApplication(1.2)
    const rule = createRule()
    const result = woodlandMinimumEligibility.execute(application, rule)

    expect(result).toEqual({
      name: 'woodland-minimum-eligibility',
      passed: true,
      reason:
        'The total woodland area (1.2 ha) meets the minimum required area of (0.5 ha)',
      description: ruleDescription,
      explanations: [
        {
          title: 'Woodland minimum eligibility',
          lines: [
            'The minimum required woodland area over 10 years old is (0.5 ha), the holding has (1.2 ha)'
          ]
        }
      ]
    })
  })

  test('should pass when woodland area is provided as a number rather than a string', () => {
    const application = createApplication(0.5)
    const rule = createRule()
    const result = woodlandMinimumEligibility.execute(application, rule)

    expect(result).toEqual({
      name: 'woodland-minimum-eligibility',
      passed: true,
      reason:
        'The total woodland area (0.5 ha) meets the minimum required area of (0.5 ha)',
      description: ruleDescription,
      explanations: [
        {
          title: 'Woodland minimum eligibility',
          lines: [
            'The minimum required woodland area over 10 years old is (0.5 ha), the holding has (0.5 ha)'
          ]
        }
      ]
    })
  })

  test('should fail when woodland area over 10 years is below the minimum of 0.5ha', () => {
    const application = createApplication('0.4')
    const rule = createRule()
    const result = woodlandMinimumEligibility.execute(application, rule)

    expect(result).toEqual({
      name: 'woodland-minimum-eligibility',
      passed: false,
      reason:
        'The total woodland area (0.4 ha) does not meet the minimum required area of (0.5 ha)',
      description: ruleDescription,
      explanations: [
        {
          title: 'Woodland minimum eligibility',
          lines: [
            'The minimum required woodland area over 10 years old is (0.5 ha), the holding has (0.4 ha)'
          ]
        }
      ]
    })
  })

  test('should fail when no woodland area over 10 years is provided', () => {
    const application = createApplication(undefined)
    const rule = createRule()
    const result = woodlandMinimumEligibility.execute(application, rule)

    expect(result).toEqual({
      name: 'woodland-minimum-eligibility',
      passed: false,
      reason: 'No woodland area over 10 years old has been provided',
      description: ruleDescription,
      explanations: [
        {
          title: 'Woodland minimum eligibility',
          lines: [
            'The minimum required woodland area over 10 years old is (0.5 ha), the holding has (0 ha)'
          ]
        }
      ]
    })
  })

  test('should fail when old woodland area less than 80 percent of total', () => {
    const application = createApplication(3, 1)
    const rule = createRule()
    const result = woodlandMinimumEligibility.execute(application, rule)

    expect(result).toEqual({
      name: 'woodland-minimum-eligibility',
      passed: false,
      reason:
        'The percentage of woodland over 10 years old (75%) does not meet the minimum required (80%)',
      description: ruleDescription,
      explanations: [
        {
          title: 'Woodland minimum eligibility',
          lines: [
            'The minimum required woodland area over 10 years old is (0.5 ha), the holding has (4 ha)'
          ]
        }
      ]
    })
  })

  test('should pass when total woodland area exceeds the minimum of 0.5ha', () => {
    const application = createApplication(0.4, 0.1)
    const rule = createRule()
    const result = woodlandMinimumEligibility.execute(application, rule)

    expect(result).toEqual({
      name: 'woodland-minimum-eligibility',
      passed: true,
      reason:
        'The total woodland area (0.5 ha) meets the minimum required area of (0.5 ha)',
      description: ruleDescription,
      explanations: [
        {
          title: 'Woodland minimum eligibility',
          lines: [
            'The minimum required woodland area over 10 years old is (0.5 ha), the holding has (0.5 ha)'
          ]
        }
      ]
    })
  })
})
