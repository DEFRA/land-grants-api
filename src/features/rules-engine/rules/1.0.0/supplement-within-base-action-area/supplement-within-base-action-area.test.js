import { supplementWithinBaseActionArea } from './supplement-within-base-action-area.js'

const rule = {
  name: 'supplement-within-base-action-area',
  description: 'Does the supplement fit within its base action?'
}

const execute = (
  appliedForQuantity,
  supplementBaseActions,
  { code = 'GRH7_26', unit = 'ha' } = {}
) =>
  supplementWithinBaseActionArea.execute(
    {
      actionCodeAppliedFor: code,
      appliedForQuantity,
      applicationUnitOfMeasurement: unit,
      supplementBaseActions
    },
    rule
  )

const clig3 = (areaSqm) => ({
  baseCodes: ['CLIG3_26'],
  onParcel: [{ actionCode: 'CLIG3_26', areaSqm }]
})

describe('supplementWithinBaseActionArea', () => {
  test('passes a supplement on the whole of its base action', () => {
    expect(execute(5, clig3(50000))).toEqual({
      name: 'supplement-within-base-action-area',
      passed: true,
      description: 'Does the supplement fit within its base action?',
      reason: 'The area (5 ha) is within the CLIG3_26 area (5 ha)',
      explanations: [
        {
          title: 'Base action area',
          lines: [
            'The area of CLIG3_26 is (5 ha), and the applicant applied for (5 ha) of GRH7_26.'
          ]
        }
      ]
    })
  })

  test('fails a supplement over its base action, giving both areas', () => {
    expect(execute(5.0001, clig3(50000))).toEqual(
      expect.objectContaining({
        passed: false,
        reason: 'The area (5.0001 ha) must not exceed the CLIG3_26 area (5 ha)'
      })
    )
  })

  test('lets a supplement with several base actions use them all', () => {
    expect(
      execute(
        8,
        {
          baseCodes: ['CLIG3_26', 'AGF1_26'],
          onParcel: [
            { actionCode: 'CLIG3_26', areaSqm: 50000 },
            { actionCode: 'AGF1_26', areaSqm: 30000 }
          ]
        },
        { code: 'SPM3_26' }
      )
    ).toEqual(
      expect.objectContaining({
        passed: true,
        reason: 'The area (8 ha) is within the CLIG3_26 and AGF1_26 area (8 ha)'
      })
    )
  })

  test('fails a supplement with no base action on the parcel against no area', () => {
    expect(execute(1, { baseCodes: ['CLIG3_26'], onParcel: [] }).reason).toBe(
      'The area (1 ha) must not exceed the CLIG3_26 area (0 ha)'
    )
  })

  test('works in square metres for a supplement measured in them', () => {
    expect(execute(6000, clig3(5000), { unit: 'sqm' })).toEqual(
      expect.objectContaining({
        passed: false,
        reason:
          'The area (6000 sqm) must not exceed the CLIG3_26 area (5000 sqm)'
      })
    )
  })
})
