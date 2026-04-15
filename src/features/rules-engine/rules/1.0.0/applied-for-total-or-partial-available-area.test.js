import { appliedForTotalOrPartialAvailableArea } from './applied-for-total-or-partial-available-area.js'

describe('appliedForTotalOrPartialAvailableArea', () => {
  const createApplication = (areaAppliedFor, parcelArea) => ({
    areaAppliedFor,
    landParcel: {
      area: parcelArea
    }
  })

  const createRule = (
    name = 'applied-for-total-or-partial-available-area',
    minimumAppliedHa = 1
  ) => ({
    name,
    config: { minimumAppliedHa }
  })

  test('should pass when area applied for equals the minimum allowed', () => {
    const application = createApplication('1', '10.5')
    const rule = createRule()
    const result = appliedForTotalOrPartialAvailableArea.execute(
      application,
      rule
    )

    expect(result).toEqual({
      name: 'applied-for-total-or-partial-available-area',
      passed: true,
      reason:
        'The applied figure (1 ha) is within the allowed range (1 ha to 10.5 ha)',
      explanations: [
        {
          title: 'Total or partial available area',
          lines: [
            'The minimum allowed applied area is (1 ha), the available area is (10.5 ha), the applicant applied for (1 ha)'
          ]
        }
      ]
    })
  })

  test('should pass when area applied for is between minimum and available area', () => {
    const application = createApplication(5.25, '10.5')
    const rule = createRule()
    const result = appliedForTotalOrPartialAvailableArea.execute(
      application,
      rule
    )

    expect(result).toEqual({
      name: 'applied-for-total-or-partial-available-area',
      passed: true,
      reason:
        'The applied figure (5.25 ha) is within the allowed range (1 ha to 10.5 ha)',
      explanations: [
        {
          title: 'Total or partial available area',
          lines: [
            'The minimum allowed applied area is (1 ha), the available area is (10.5 ha), the applicant applied for (5.25 ha)'
          ]
        }
      ]
    })
  })

  test('should fail when area applied for is below minimum allowed area', () => {
    const application = createApplication('0.5', '10.5')
    const rule = createRule()
    const result = appliedForTotalOrPartialAvailableArea.execute(
      application,
      rule
    )

    expect(result).toEqual({
      name: 'applied-for-total-or-partial-available-area',
      passed: false,
      reason:
        'The applied figure (0.5 ha) must be between (1 ha) and (10.5 ha)',
      explanations: [
        {
          title: 'Total or partial available area',
          lines: [
            'The minimum allowed applied area is (1 ha), the available area is (10.5 ha), the applicant applied for (0.5 ha)'
          ]
        }
      ]
    })
  })

  test('should fail when area applied for exceeds available area', () => {
    const application = createApplication('11', '10.5')
    const rule = createRule()
    const result = appliedForTotalOrPartialAvailableArea.execute(
      application,
      rule
    )

    expect(result).toEqual({
      name: 'applied-for-total-or-partial-available-area',
      passed: false,
      reason: 'The applied figure (11 ha) must be between (1 ha) and (10.5 ha)',
      explanations: [
        {
          title: 'Total or partial available area',
          lines: [
            'The minimum allowed applied area is (1 ha), the available area is (10.5 ha), the applicant applied for (11 ha)'
          ]
        }
      ]
    })
  })

  test('should fail when area applied for is invalid and coerced to zero', () => {
    const application = createApplication(undefined, '10.5')
    const rule = createRule()
    const result = appliedForTotalOrPartialAvailableArea.execute(
      application,
      rule
    )

    expect(result).toEqual({
      name: 'applied-for-total-or-partial-available-area',
      passed: false,
      reason: 'The applied figure (0 ha) must be between (1 ha) and (10.5 ha)',
      explanations: [
        {
          title: 'Total or partial available area',
          lines: [
            'The minimum allowed applied area is (1 ha), the available area is (10.5 ha), the applicant applied for (0 ha)'
          ]
        }
      ]
    })
  })
})
