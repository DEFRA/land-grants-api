import { appliedForTotalOrPartialAvailableArea } from './applied-for-total-or-partial-available-area.js'
import { haToSqm } from '~/src/features/common/helpers/measurement.js'

describe('appliedForTotalOrPartialAvailableArea', () => {
  const createApplication = (
    appliedForQuantity,
    parcelArea,
    applicationUnitOfMeasurement = 'ha'
  ) => ({
    appliedForQuantity,
    applicationUnitOfMeasurement,
    landParcel: {
      availableAreaSqm: haToSqm(Number.parseFloat(parcelArea))
    }
  })

  const createRule = (
    name = 'applied-for-total-or-partial-available-area'
  ) => ({
    name,
    config: {}
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
        'The applied figure (1 ha) is within the allowed range (greater than 0 ha and up to 10.5 ha)',
      explanations: [
        {
          title: 'Total or partial available area',
          lines: [
            'The available area is (10.5 ha), and the applicant applied for (1 ha).'
          ]
        }
      ]
    })
  })

  test('should pass when area applied for is between zero and available area', () => {
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
        'The applied figure (5.25 ha) is within the allowed range (greater than 0 ha and up to 10.5 ha)',
      explanations: [
        {
          title: 'Total or partial available area',
          lines: [
            'The available area is (10.5 ha), and the applicant applied for (5.25 ha).'
          ]
        }
      ]
    })
  })

  test.each([
    ['0', '0 ha'],
    [undefined, '0 ha'],
    ['11.6', '11.6 ha']
  ])(
    'should fail for invalid or out of range appliedFor (%s)',
    (appliedFor, expectedDisplay) => {
      const application = createApplication(appliedFor, '10.5')
      const rule = createRule()
      const result = appliedForTotalOrPartialAvailableArea.execute(
        application,
        rule
      )

      expect(result).toEqual({
        name: 'applied-for-total-or-partial-available-area',
        passed: false,
        reason:
          'The amount of land must be the same as or less than the available area',
        explanations: [
          {
            title: 'Total or partial available area',
            lines: [
              `The available area is (10.5 ha), and the applicant applied for (${expectedDisplay}).`
            ]
          }
        ]
      })
    }
  )

  test('should fail when area applied for is above available area', () => {
    const application = createApplication('11.5', '10.5')
    const rule = createRule()
    const result = appliedForTotalOrPartialAvailableArea.execute(
      application,
      rule
    )

    expect(result).toEqual({
      name: 'applied-for-total-or-partial-available-area',
      passed: false,
      reason:
        'The amount of land must be the same as or less than the available area',
      explanations: [
        {
          title: 'Total or partial available area',
          lines: [
            'The available area is (10.5 ha), and the applicant applied for (11.5 ha).'
          ]
        }
      ]
    })
  })

  test('should pass when area applied for equals available area', () => {
    const application = createApplication('10.5', '10.5')
    const rule = createRule()
    const result = appliedForTotalOrPartialAvailableArea.execute(
      application,
      rule
    )

    expect(result).toEqual({
      name: 'applied-for-total-or-partial-available-area',
      passed: true,
      reason:
        'The applied figure (10.5 ha) is within the allowed range (greater than 0 ha and up to 10.5 ha)',
      explanations: [
        {
          title: 'Total or partial available area',
          lines: [
            'The available area is (10.5 ha), and the applicant applied for (10.5 ha).'
          ]
        }
      ]
    })
  })

  describe('sqm actions (e.g. buildings)', () => {
    const createSqmApplication = (appliedForQuantity, availableAreaSqm) => ({
      appliedForQuantity,
      applicationUnitOfMeasurement: 'sqm',
      landParcel: { availableAreaSqm }
    })

    test('should pass when area applied for is between zero and available area, in sqm', () => {
      const application = createSqmApplication(100, 150)
      const rule = createRule()
      const result = appliedForTotalOrPartialAvailableArea.execute(
        application,
        rule
      )

      expect(result).toEqual({
        name: 'applied-for-total-or-partial-available-area',
        passed: true,
        reason:
          'The applied figure (100 sqm) is within the allowed range (greater than 0 sqm and up to 150 sqm)',
        explanations: [
          {
            title: 'Total or partial available area',
            lines: [
              'The available area is (150 sqm), and the applicant applied for (100 sqm).'
            ]
          }
        ]
      })
    })

    test('should fail when area applied for is above available area, in sqm', () => {
      const application = createSqmApplication(200, 150)
      const rule = createRule()
      const result = appliedForTotalOrPartialAvailableArea.execute(
        application,
        rule
      )

      expect(result).toEqual({
        name: 'applied-for-total-or-partial-available-area',
        passed: false,
        reason:
          'The amount of land must be the same as or less than the available area',
        explanations: [
          {
            title: 'Total or partial available area',
            lines: [
              'The available area is (150 sqm), and the applicant applied for (200 sqm).'
            ]
          }
        ]
      })
    })

    test('should fail when there is no available area, in sqm', () => {
      const application = createSqmApplication(0, 0)
      const rule = createRule()
      const result = appliedForTotalOrPartialAvailableArea.execute(
        application,
        rule
      )

      expect(result).toEqual({
        name: 'applied-for-total-or-partial-available-area',
        passed: false,
        reason:
          'The amount of land must be the same as or less than the available area',
        explanations: [
          {
            title: 'Total or partial available area',
            lines: [
              'The available area is (0 sqm), and the applicant applied for (0 sqm).'
            ]
          }
        ]
      })
    })
  })
})
