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
    tolerancePercent = 10
  ) => ({
    name,
    config: { tolerancePercent }
  })

  test('should pass when area applied for is greater than 0 and within available area', () => {
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
        'The applied figure (1 ha) is within the allowed range (greater than 0 ha and up to 11.55 ha)',
      explanations: [
        {
          title: 'Total or partial available area',
          lines: [
            'The available area is (10.5 ha), the tolerance is (10%), and the applicant applied for (1 ha).'
          ]
        }
      ]
    })
  })

  test('should pass when area applied for is between zero and tolerance-adjusted maximum', () => {
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
        'The applied figure (5.25 ha) is within the allowed range (greater than 0 ha and up to 11.55 ha)',
      explanations: [
        {
          title: 'Total or partial available area',
          lines: [
            'The available area is (10.5 ha), the tolerance is (10%), and the applicant applied for (5.25 ha).'
          ]
        }
      ]
    })
  })

  test('should fail when area applied for is zero', () => {
    const application = createApplication('0', '10.5')
    const rule = createRule()
    const result = appliedForTotalOrPartialAvailableArea.execute(
      application,
      rule
    )

    expect(result).toEqual({
      name: 'applied-for-total-or-partial-available-area',
      passed: false,
      reason:
        'The applied figure (0 ha) must be greater than 0 ha and no more than (11.55 ha), based on (10.5 ha) with (10%) tolerance',
      explanations: [
        {
          title: 'Total or partial available area',
          lines: [
            'The available area is (10.5 ha), the tolerance is (10%), and the applicant applied for (0 ha).'
          ]
        }
      ]
    })
  })

  test('should fail when area applied for exceeds available area', () => {
    const application = createApplication('11.6', '10.5')
    const rule = createRule()
    const result = appliedForTotalOrPartialAvailableArea.execute(
      application,
      rule
    )

    expect(result).toEqual({
      name: 'applied-for-total-or-partial-available-area',
      passed: false,
      reason:
        'The applied figure (11.6 ha) must be greater than 0 ha and no more than (11.55 ha), based on (10.5 ha) with (10%) tolerance',
      explanations: [
        {
          title: 'Total or partial available area',
          lines: [
            'The available area is (10.5 ha), the tolerance is (10%), and the applicant applied for (11.6 ha).'
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
      reason:
        'The applied figure (0 ha) must be greater than 0 ha and no more than (11.55 ha), based on (10.5 ha) with (10%) tolerance',
      explanations: [
        {
          title: 'Total or partial available area',
          lines: [
            'The available area is (10.5 ha), the tolerance is (10%), and the applicant applied for (0 ha).'
          ]
        }
      ]
    })
  })

  test('should pass when area applied for is above available area but within tolerance', () => {
    const application = createApplication('11.5', '10.5')
    const rule = createRule()
    const result = appliedForTotalOrPartialAvailableArea.execute(
      application,
      rule
    )

    expect(result).toEqual({
      name: 'applied-for-total-or-partial-available-area',
      passed: true,
      reason:
        'The applied figure (11.5 ha) is within the allowed range (greater than 0 ha and up to 11.55 ha)',
      explanations: [
        {
          title: 'Total or partial available area',
          lines: [
            'The available area is (10.5 ha), the tolerance is (10%), and the applicant applied for (11.5 ha).'
          ]
        }
      ]
    })
  })

  test('should pass when area applied for equals the tolerance-adjusted maximum', () => {
    const application = createApplication('11.55', '10.5')
    const rule = createRule()
    const result = appliedForTotalOrPartialAvailableArea.execute(
      application,
      rule
    )

    expect(result).toEqual({
      name: 'applied-for-total-or-partial-available-area',
      passed: true,
      reason:
        'The applied figure (11.55 ha) is within the allowed range (greater than 0 ha and up to 11.55 ha)',
      explanations: [
        {
          title: 'Total or partial available area',
          lines: [
            'The available area is (10.5 ha), the tolerance is (10%), and the applicant applied for (11.55 ha).'
          ]
        }
      ]
    })
  })

  test('should use zero tolerance when tolerance is missing', () => {
    const application = createApplication('10.6', '10.5')
    const rule = {
      name: 'applied-for-total-or-partial-available-area',
      config: {}
    }
    const result = appliedForTotalOrPartialAvailableArea.execute(
      application,
      rule
    )

    expect(result).toEqual({
      name: 'applied-for-total-or-partial-available-area',
      passed: false,
      reason:
        'The applied figure (10.6 ha) must be greater than 0 ha and no more than (10.5 ha), based on (10.5 ha) with (0%) tolerance',
      explanations: [
        {
          title: 'Total or partial available area',
          lines: [
            'The available area is (10.5 ha), the tolerance is (0%), and the applicant applied for (10.6 ha).'
          ]
        }
      ]
    })
  })
})
