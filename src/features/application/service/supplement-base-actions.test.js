import { getSupplementBaseActions } from './supplement-base-actions.js'

// Real 2026 rows: CLIG3_26 is the base of GRH7_26, and CLIG3_26, AGF1_26 and
// OFM1_26 are bases of SPM3_26
const baseCodesBySupplement = new Map([
  ['GRH7_26', new Set(['CLIG3_26'])],
  ['SPM3_26', new Set(['CLIG3_26', 'AGF1_26', 'OFM1_26'])]
])

const enabled = (code, unit = 'ha') => ({
  code,
  applicationUnitOfMeasurement: unit
})
const actions = ['CLIG3_26', 'AGF1_26', 'CAGF1', 'GRH7_26', 'SPM3_26'].map(
  (code) => enabled(code)
)

const applied = (code, quantity) => ({ code, quantity })

const baseActionsOf = (code, appliedOnParcel, enabledActions = actions) => {
  const landAction = {
    sheetId: 'SD6154',
    parcelId: '8973',
    actions: appliedOnParcel
  }

  return getSupplementBaseActions(
    landAction.actions.find((a) => a.code === code),
    landAction,
    enabledActions,
    baseCodesBySupplement
  )
}

describe('getSupplementBaseActions', () => {
  test('gives the base action applied for on the parcel, in square metres', () => {
    expect(
      baseActionsOf('GRH7_26', [
        applied('CLIG3_26', 5),
        applied('CAGF1', 3),
        applied('GRH7_26', 4)
      ])
    ).toEqual({
      baseCodes: ['CLIG3_26'],
      onParcel: [{ actionCode: 'CLIG3_26', areaSqm: 50000 }]
    })
  })

  test('gives none on the parcel for a supplement applied for without its base action', () => {
    expect(
      baseActionsOf('GRH7_26', [applied('CAGF1', 10), applied('GRH7_26', 4)])
    ).toEqual({ baseCodes: ['CLIG3_26'], onParcel: [] })
  })

  test('names only the base actions we offer', () => {
    expect(baseActionsOf('SPM3_26', [applied('SPM3_26', 1)]).baseCodes).toEqual(
      ['CLIG3_26', 'AGF1_26']
    )
  })

  test('names every base action when we offer none of them', () => {
    expect(
      baseActionsOf('SPM3_26', [applied('SPM3_26', 1)], [enabled('SPM3_26')])
        .baseCodes
    ).toEqual(['CLIG3_26', 'AGF1_26', 'OFM1_26'])
  })

  test('gives every one of its base actions on the parcel', () => {
    expect(
      baseActionsOf('SPM3_26', [
        applied('CLIG3_26', 5),
        applied('AGF1_26', 3),
        applied('SPM3_26', 8)
      ]).onParcel
    ).toEqual([
      { actionCode: 'CLIG3_26', areaSqm: 50000 },
      { actionCode: 'AGF1_26', areaSqm: 30000 }
    ])
  })

  test("leaves out another supplement's base action", () => {
    expect(
      baseActionsOf('GRH7_26', [
        applied('AGF1_26', 3),
        applied('SPM3_26', 1),
        applied('GRH7_26', 1)
      ]).onParcel
    ).toEqual([])
  })

  test('keeps a base action measured in square metres as it is', () => {
    expect(
      baseActionsOf(
        'GRH7_26',
        [applied('CLIG3_26', 5000), applied('GRH7_26', 1)],
        [enabled('CLIG3_26', 'sqm'), enabled('GRH7_26')]
      ).onParcel
    ).toEqual([{ actionCode: 'CLIG3_26', areaSqm: 5000 }])
  })

  test('gives no base actions for an action that is not a supplement', () => {
    expect(
      baseActionsOf('CLIG3_26', [applied('CLIG3_26', 5), applied('GRH7_26', 4)])
    ).toEqual({ baseCodes: [], onParcel: [] })
  })
})
