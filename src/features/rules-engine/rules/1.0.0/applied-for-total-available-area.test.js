import { appliedForTotalAvailableArea } from './applied-for-total-available-area.js'

describe('appliedForTotalAvailableArea', () => {
  const createApplication = (areaAppliedFor, parcelArea) => ({
    areaAppliedFor,
    landParcel: {
      area: parcelArea
    }
  })

  const createRule = (name = 'applied-for-total-available-area') => ({
    name
  })

  test('should pass when area applied for matches parcel area', () => {
    const application = createApplication('10.5', '10.5')
    const rule = createRule()
    const result = appliedForTotalAvailableArea.execute(application, rule)

    expect(result).toEqual({
      name: 'applied-for-total-available-area',
      passed: true,
      reason:
        'There is sufficient available area (10.5 ha) for the applied figure (10.5 ha)',
      explanations: [
        {
          title: 'Total valid land cover',
          lines: [
            'The available area was (10.5 ha) the applicant applied for (10.5 ha)'
          ]
        }
      ]
    })
  })

  test('should pass when area applied for matches parcel area with different types but same value', () => {
    const application = createApplication(10.5, '10.5')
    const rule = createRule()
    const result = appliedForTotalAvailableArea.execute(application, rule)

    expect(result).toEqual({
      name: 'applied-for-total-available-area',
      passed: true,
      reason:
        'There is sufficient available area (10.5 ha) for the applied figure (10.5 ha)',
      explanations: [
        {
          title: 'Total valid land cover',
          lines: [
            'The available area was (10.5 ha) the applicant applied for (10.5 ha)'
          ]
        }
      ]
    })
  })

  test('should fail when area applied for does not match parcel area', () => {
    const application = createApplication('9.5', '10.5')
    const rule = createRule()
    const result = appliedForTotalAvailableArea.execute(application, rule)

    expect(result).toEqual({
      name: 'applied-for-total-available-area',
      passed: false,
      reason:
        'There is not sufficient available area (10.5 ha) for the applied figure (9.5 ha)',
      explanations: [
        {
          title: 'Total valid land cover',
          lines: [
            'The available area was (10.5 ha) the applicant applied for (9.5 ha)'
          ]
        }
      ]
    })
  })

  test('should handle string and number comparison correctly', () => {
    const application = createApplication(10.1, '10.1')
    const rule = createRule()
    const result = appliedForTotalAvailableArea.execute(application, rule)

    expect(result).toEqual({
      name: 'applied-for-total-available-area',
      passed: true,
      reason:
        'There is sufficient available area (10.1 ha) for the applied figure (10.1 ha)',
      explanations: [
        {
          title: 'Total valid land cover',
          lines: [
            'The available area was (10.1 ha) the applicant applied for (10.1 ha)'
          ]
        }
      ]
    })
  })
})
