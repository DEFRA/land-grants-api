import { woodlandTotalArea } from './woodland-total-area.js'

const ruleDescription =
  'Has the total available area for the woodland management plan been applied for?'

describe('woodlandTotalArea', () => {
  const createApplication = (
    oldWoodlandArea,
    newWoodlandArea,
    totalParcelArea
  ) => ({
    oldWoodlandArea,
    newWoodlandArea,
    totalParcelArea
  })

  const createRule = (name = 'woodland-total-area') => ({
    name,
    description: ruleDescription
  })

  test('should pass when total woodland area equals total parcel area', () => {
    const application = createApplication(10, 0.5, 10.5)
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
    const application = createApplication(10, 0, 10.5)
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
    const application = createApplication(6, 2, 10.5)
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
    const application = createApplication(10, 0.5, '10.5')
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

  test('should fail when total woodland area exceeds total parcel area', () => {
    const application = createApplication(10, 2, '10.5')
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
    const application = createApplication(1, undefined, '10.5')
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
})
