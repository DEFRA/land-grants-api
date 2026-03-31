import { woodlandTotalArea } from './woodland-total-area.js'

const ruleDescription =
  'Has the total available area for the woodland management plan been applied for?'

describe('woodlandTotalArea', () => {
  const createApplication = (
    oldWoodlandAreaHa,
    newWoodlandAreaHa,
    totalParcelAreaSqm
  ) => ({
    oldWoodlandAreaHa,
    newWoodlandAreaHa,
    totalParcelAreaSqm
  })

  const createRule = (name = 'woodland-total-area') => ({
    name,
    description: ruleDescription
  })

  test('should pass when total woodland area equals total parcel area', () => {
    const application = createApplication(10, 0.5, 105000)
    const rule = createRule()
    const result = woodlandTotalArea.execute(application, rule)

    expect(result).toEqual({
      name: 'woodland-total-area',
      passed: true,
      reason:
        'The total woodland area (10.5 ha) does not exceed the total land parcel area (10.5 ha)',
      description: ruleDescription,
      explanations: [
        {
          title: 'Woodland total area',
          lines: [
            'The total land parcel area is (10.5 ha), the total woodland area (young + old) is (10.5 ha)'
          ]
        }
      ]
    })
  })

  test('should pass when new woodland area is zero and old woodland area is less than parcel area', () => {
    const application = createApplication(10, 0, 105000)
    const rule = createRule()
    const result = woodlandTotalArea.execute(application, rule)

    expect(result).toEqual({
      name: 'woodland-total-area',
      passed: true,
      reason:
        'The total woodland area (10 ha) does not exceed the total land parcel area (10.5 ha)',
      description: ruleDescription,
      explanations: [
        {
          title: 'Woodland total area',
          lines: [
            'The total land parcel area is (10.5 ha), the total woodland area (young + old) is (10 ha)'
          ]
        }
      ]
    })
  })

  test('should pass when total woodland area is less than total parcel area', () => {
    const application = createApplication(6, 2, 105000)
    const rule = createRule()
    const result = woodlandTotalArea.execute(application, rule)

    expect(result).toEqual({
      name: 'woodland-total-area',
      passed: true,
      reason:
        'The total woodland area (8 ha) does not exceed the total land parcel area (10.5 ha)',
      description: ruleDescription,
      explanations: [
        {
          title: 'Woodland total area',
          lines: [
            'The total land parcel area is (10.5 ha), the total woodland area (young + old) is (8 ha)'
          ]
        }
      ]
    })
  })

  test('should pass when woodland area is provided as a number rather than a string', () => {
    const application = createApplication(10, 0.5, '105000')
    const rule = createRule()
    const result = woodlandTotalArea.execute(application, rule)

    expect(result).toEqual({
      name: 'woodland-total-area',
      passed: true,
      reason:
        'The total woodland area (10.5 ha) does not exceed the total land parcel area (10.5 ha)',
      description: ruleDescription,
      explanations: [
        {
          title: 'Woodland total area',
          lines: [
            'The total land parcel area is (10.5 ha), the total woodland area (young + old) is (10.5 ha)'
          ]
        }
      ]
    })
  })

  test('should pass when woodland area is provided and hectares rounded to 4 decimal places', () => {
    const application = createApplication(9.11223, 0.533233, 105434.3432)
    const rule = createRule()
    const result = woodlandTotalArea.execute(application, rule)

    expect(result).toEqual({
      name: 'woodland-total-area',
      passed: true,
      reason:
        'The total woodland area (9.6455 ha) does not exceed the total land parcel area (10.5434 ha)',
      description: ruleDescription,
      explanations: [
        {
          title: 'Woodland total area',
          lines: [
            'The total land parcel area is (10.5434 ha), the total woodland area (young + old) is (9.6455 ha)'
          ]
        }
      ]
    })
  })

  test('should fail when total woodland area exceeds total parcel area', () => {
    const application = createApplication(10, 2, 105000)
    const rule = createRule()
    const result = woodlandTotalArea.execute(application, rule)

    expect(result).toEqual({
      name: 'woodland-total-area',
      passed: false,
      reason:
        'The total woodland area (12 ha) exceeds the total land parcel area (10.5 ha)',
      description: ruleDescription,
      explanations: [
        {
          title: 'Woodland total area',
          lines: [
            'The total land parcel area is (10.5 ha), the total woodland area (young + old) is (12 ha)'
          ]
        }
      ]
    })
  })

  test('should pass when no new woodland area is provided', () => {
    const application = createApplication(1, undefined, 105000)
    const rule = createRule()
    const result = woodlandTotalArea.execute(application, rule)

    expect(result).toEqual({
      name: 'woodland-total-area',
      passed: true,
      reason:
        'The total woodland area (1 ha) does not exceed the total land parcel area (10.5 ha)',
      description: ruleDescription,
      explanations: [
        {
          title: 'Woodland total area',
          lines: [
            'The total land parcel area is (10.5 ha), the total woodland area (young + old) is (1 ha)'
          ]
        }
      ]
    })
  })

  test('should pass when no new or old area is provided', () => {
    const application = createApplication(undefined, undefined, 105000)
    const rule = createRule()
    const result = woodlandTotalArea.execute(application, rule)

    expect(result).toEqual({
      name: 'woodland-total-area',
      passed: true,
      reason:
        'The total woodland area (0 ha) does not exceed the total land parcel area (10.5 ha)',
      description: ruleDescription,
      explanations: [
        {
          title: 'Woodland total area',
          lines: [
            'The total land parcel area is (10.5 ha), the total woodland area (young + old) is (0 ha)'
          ]
        }
      ]
    })
  })

  test('should pass when old area is larger until rounded and does not exceed total parcel area', () => {
    const application = createApplication(10.50001, undefined, 105000)
    const rule = createRule()
    const result = woodlandTotalArea.execute(application, rule)

    expect(result).toEqual({
      name: 'woodland-total-area',
      passed: true,
      reason:
        'The total woodland area (10.5 ha) does not exceed the total land parcel area (10.5 ha)',
      description: ruleDescription,
      explanations: [
        {
          title: 'Woodland total area',
          lines: [
            'The total land parcel area is (10.5 ha), the total woodland area (young + old) is (10.5 ha)'
          ]
        }
      ]
    })
  })

  test('should fail when new and old area is larger until rounded and exceeds total parcel area', () => {
    const application = createApplication(10.00001, 0.50001, 105000)
    const rule = createRule()
    const result = woodlandTotalArea.execute(application, rule)

    expect(result).toEqual({
      name: 'woodland-total-area',
      passed: true,
      reason:
        'The total woodland area (10.5 ha) does not exceed the total land parcel area (10.5 ha)',
      description: ruleDescription,
      explanations: [
        {
          title: 'Woodland total area',
          lines: [
            'The total land parcel area is (10.5 ha), the total woodland area (young + old) is (10.5 ha)'
          ]
        }
      ]
    })
  })

  test('should fail when new and old area is larger when rounded and exceeds total parcel area', () => {
    const application = createApplication(10.00001, 0.50009, 105000)
    const rule = createRule()
    const result = woodlandTotalArea.execute(application, rule)

    expect(result).toEqual({
      name: 'woodland-total-area',
      passed: false,
      reason:
        'The total woodland area (10.5001 ha) exceeds the total land parcel area (10.5 ha)',
      description: ruleDescription,
      explanations: [
        {
          title: 'Woodland total area',
          lines: [
            'The total land parcel area is (10.5 ha), the total woodland area (young + old) is (10.5001 ha)'
          ]
        }
      ]
    })
  })

})
