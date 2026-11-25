import { supplementHasBaseAction } from './supplement-has-base-action.js'

const rule = {
  name: 'supplement-has-base-action',
  description: 'Is the supplement applied for with its base action?'
}

const execute = (code, supplementBaseActions) =>
  supplementHasBaseAction.execute(
    { actionCodeAppliedFor: code, supplementBaseActions },
    rule
  )

describe('supplementHasBaseAction', () => {
  test('fails a supplement applied for without its base action, naming it', () => {
    expect(
      execute('GRH7_26', { baseCodes: ['CLIG3_26'], onParcel: [] })
    ).toEqual({
      name: 'supplement-has-base-action',
      passed: false,
      description: 'Is the supplement applied for with its base action?',
      reason:
        'GRH7_26 requires the base action CLIG3_26 on the same land parcel',
      explanations: [
        {
          title: 'Base action',
          lines: [
            'GRH7_26 is a supplement of CLIG3_26, which is not applied for on this land parcel in this application.'
          ]
        }
      ]
    })
  })

  test('names every base action it could have', () => {
    const result = execute('SPM3_26', {
      baseCodes: ['CLIG3_26', 'AGF1_26'],
      onParcel: []
    })

    expect(result.reason).toBe(
      'SPM3_26 requires the base action CLIG3_26 or AGF1_26 on the same land parcel'
    )
    expect(result.explanations[0].lines[0]).toBe(
      'SPM3_26 is a supplement of CLIG3_26 or AGF1_26, none of which is applied for on this land parcel in this application.'
    )
  })

  test('passes a supplement applied for with its base action', () => {
    expect(
      execute('GRH7_26', {
        baseCodes: ['CLIG3_26'],
        onParcel: [{ actionCode: 'CLIG3_26', areaSqm: 50000 }]
      })
    ).toEqual({
      name: 'supplement-has-base-action',
      passed: true,
      description: 'Is the supplement applied for with its base action?',
      reason: 'GRH7_26 is applied for with its base action CLIG3_26',
      explanations: [
        {
          title: 'Base action',
          lines: [
            'GRH7_26 is a supplement of CLIG3_26, applied for on this land parcel.'
          ]
        }
      ]
    })
  })

  test('names each base action on the parcel once', () => {
    expect(
      execute('SPM3_26', {
        baseCodes: ['CLIG3_26', 'AGF1_26'],
        onParcel: [
          { actionCode: 'CLIG3_26', areaSqm: 10000 },
          { actionCode: 'AGF1_26', areaSqm: 10000 },
          { actionCode: 'CLIG3_26', areaSqm: 10000 }
        ]
      }).reason
    ).toBe('SPM3_26 is applied for with its base action CLIG3_26 and AGF1_26')
  })

  test('fails an action with no base action in the compatibility matrix', () => {
    expect(execute('CLIG3_26', { baseCodes: [], onParcel: [] })).toEqual(
      expect.objectContaining({
        passed: false,
        reason: 'CLIG3_26 is not a supplement of any action'
      })
    )
  })
})
