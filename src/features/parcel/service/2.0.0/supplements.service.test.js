import { getSupplementsWithAvailability } from './supplements.service.js'

const enabledAction = (code, unit = 'ha') => ({
  code,
  description: `${code} description`,
  semanticVersion: '1.0.0',
  applicationUnitOfMeasurement: unit,
  display: true,
  payment: { ratePerUnitGbp: 10 }
})

// Real 2026 rows: CLIG3 is a base for GRH7, GRH8 and GRH11, and LIG1 for GRH10
const baseCodesBySupplement = new Map([
  ['GRH7', new Set(['CLIG3'])],
  ['GRH8', new Set(['CLIG3'])],
  ['GRH11', new Set(['CLIG3'])],
  ['GRH10', new Set(['LIG1'])]
])

const enabledActions = ['CLIG3', 'LIG1', 'GRH7', 'GRH8', 'GRH10', 'GRH11'].map(
  (code) => enabledAction(code)
)

const clig3 = { actionCode: 'CLIG3', quantity: 2.5, unit: 'ha' }

const supplementsFor = (overrides = {}) =>
  getSupplementsWithAvailability({
    baseActionCode: 'CLIG3',
    plannedActions: [clig3],
    enabledActions,
    baseCodesBySupplement,
    ...overrides
  })

describe('getSupplementsWithAvailability', () => {
  test('returns the supplements of the base action, each available up to its area', () => {
    const supplements = supplementsFor()

    expect(supplements.map((s) => s.code)).toEqual(['GRH7', 'GRH8', 'GRH11'])
    for (const supplement of supplements) {
      expect(supplement).toEqual(
        expect.objectContaining({
          availability: { unit: 'ha', value: 2.5 },
          isAvailable: true,
          ratePerUnitGbp: 10,
          version: '1.0.0'
        })
      )
      expect(supplement.unavailableReason).toBeUndefined()
    }
  })

  test('leaves out supplements that are enabled but not displayed', () => {
    const supplements = supplementsFor({
      enabledActions: enabledActions.map((action) =>
        action.code === 'GRH8' ? { ...action, display: false } : action
      )
    })

    expect(supplements.map((s) => s.code)).toEqual(['GRH7', 'GRH11'])
  })

  test('leaves out supplements of the base action that are not enabled', () => {
    const supplements = supplementsFor({
      enabledActions: enabledActions.filter((action) => action.code !== 'GRH7')
    })

    expect(supplements.map((s) => s.code)).toEqual(['GRH8', 'GRH11'])
  })

  test('leaves the base action area to every supplement, whatever is selected', () => {
    const supplements = supplementsFor({
      plannedActions: [
        clig3,
        {
          actionCode: 'GRH7',
          quantity: 2,
          unit: 'ha',
          baseActionCode: 'CLIG3'
        },
        { actionCode: 'GRH8', quantity: 3, unit: 'ha' }
      ]
    })

    expect(supplements.map((s) => s.availability.value)).toEqual([
      2.5, 2.5, 2.5
    ])
  })

  test('reports availability in square metres for a supplement measured in them', () => {
    const [supplement] = supplementsFor({
      enabledActions: [enabledAction('GRH7', 'sqm')]
    })

    expect(supplement.availability).toEqual({ unit: 'sqm', value: 25000 })
  })

  test('converts a base action given in square metres', () => {
    const [supplement] = supplementsFor({
      plannedActions: [{ actionCode: 'CLIG3', quantity: 25000, unit: 'sqm' }]
    })

    expect(supplement.availability).toEqual({ unit: 'ha', value: 2.5 })
  })

  test('returns no supplements when the base action has none', () => {
    expect(
      supplementsFor({
        baseActionCode: 'GRH7',
        plannedActions: [{ actionCode: 'GRH7', quantity: 1, unit: 'ha' }]
      })
    ).toEqual([])
  })
})
