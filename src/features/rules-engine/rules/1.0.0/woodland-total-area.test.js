import { woodlandTotalArea } from './woodland-total-area.js'

describe('woodlandTotalArea', () => {
  const createApplication = (totalWoodlandArea, totalParcelArea) => ({
    totalWoodlandArea,
    totalParcelArea
  })

  const createRule = (name = 'woodland-total-area') => ({
    name
  })

  test('should pass when total woodland area equals total parcel area', () => {
    const application = createApplication('10.5', '10.5')
    const rule = createRule()
    const result = woodlandTotalArea.execute(application, rule)

    expect(result).toEqual({
      name: 'woodland-total-area',
      passed: true,
      reason:
        'The total woodland area (10.5 ha) does not exceed the total land parcel area (10.5 ha)',
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

  test('should pass when total woodland area is less than total parcel area', () => {
    const application = createApplication('8.0', '10.5')
    const rule = createRule()
    const result = woodlandTotalArea.execute(application, rule)

    expect(result).toEqual({
      name: 'woodland-total-area',
      passed: true,
      reason:
        'The total woodland area (8 ha) does not exceed the total land parcel area (10.5 ha)',
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
    const application = createApplication(10.5, '10.5')
    const rule = createRule()
    const result = woodlandTotalArea.execute(application, rule)

    expect(result).toEqual({
      name: 'woodland-total-area',
      passed: true,
      reason:
        'The total woodland area (10.5 ha) does not exceed the total land parcel area (10.5 ha)',
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
    const application = createApplication('12.0', '10.5')
    const rule = createRule()
    const result = woodlandTotalArea.execute(application, rule)

    expect(result).toEqual({
      name: 'woodland-total-area',
      passed: false,
      reason:
        'The total woodland area (12 ha) exceeds the total land parcel area (10.5 ha)',
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

  test('should fail when no total woodland area is provided', () => {
    const application = createApplication(undefined, '10.5')
    const rule = createRule()
    const result = woodlandTotalArea.execute(application, rule)

    expect(result).toEqual({
      name: 'woodland-total-area',
      passed: false,
      reason: 'No total woodland area has been provided',
      explanations: [
        {
          title: 'Woodland total area',
          lines: [
            'The total land parcel area is (10.5 ha), the total woodland area (young + old) is (NaN ha)'
          ]
        }
      ]
    })
  })
})
