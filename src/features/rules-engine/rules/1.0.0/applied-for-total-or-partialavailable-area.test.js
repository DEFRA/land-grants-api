import { appliedForTotalOrPartialavailableArea } from './applied-for-total-or-partialavailable-area.js'

describe('appliedForTotalOrPartialavailableArea', () => {
  const createApplication = (areaAppliedFor, parcelArea) => ({
    areaAppliedFor,
    landParcel: {
      area: parcelArea
    }
  })

  const createRule = (
    name = 'applied-for-total-or-partialavailable-area',
    minimumAppliedHa = 1
  ) => ({
    name,
    config: { minimumAppliedHa }
  })

  test('should pass when area applied for equals the minimum allowed', () => {
    const application = createApplication('1', '10.5')
    const rule = createRule()
    const result = appliedForTotalOrPartialavailableArea.execute(
      application,
      rule
    )

    expect(result).toEqual({
      name: 'applied-for-total-or-partialavailable-area',
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
    const result = appliedForTotalOrPartialavailableArea.execute(
      application,
      rule
    )

    expect(result).toEqual({
      name: 'applied-for-total-or-partialavailable-area',
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
    const result = appliedForTotalOrPartialavailableArea.execute(
      application,
      rule
    )

    expect(result).toEqual({
      name: 'applied-for-total-or-partialavailable-area',
      passed: false,
      reason:
        'The applied figure (0.5 ha) is below the minimum allowed area (1 ha)',
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
    const result = appliedForTotalOrPartialavailableArea.execute(
      application,
      rule
    )

    expect(result).toEqual({
      name: 'applied-for-total-or-partialavailable-area',
      passed: false,
      reason:
        'There is not sufficient available area (10.5 ha) for the applied figure (11 ha)',
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

  test('should fail when area values are invalid', () => {
    const application = createApplication(undefined, '10.5')
    const rule = createRule()
    const result = appliedForTotalOrPartialavailableArea.execute(
      application,
      rule
    )

    expect(result).toEqual({
      name: 'applied-for-total-or-partialavailable-area',
      passed: false,
      reason:
        'Area values required to validate the total or partial available area rule are missing or invalid',
      explanations: [
        {
          title: 'Total or partial available area',
          lines: [
            'The minimum allowed applied area is (1 ha), the available area is (10.5 ha), the applicant applied for (NaN ha)'
          ]
        }
      ]
    })
  })
})
