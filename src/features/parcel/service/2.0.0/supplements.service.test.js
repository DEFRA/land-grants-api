import { getSupplementsWithAvailability } from './supplements.service.js'

const supplementAction = (code, unit = 'ha') => ({
  code,
  description: `${code} description`,
  semanticVersion: '1.0.0',
  applicationUnitOfMeasurement: unit,
  payment: { ratePerUnitGbp: 10 }
})

// Real 2026 rows: CLIG3 is a base for GRH7, GRH8 and GRH11
const supplementActions = [
  supplementAction('GRH7'),
  supplementAction('GRH8'),
  supplementAction('GRH11')
]

const baseAction = { actionCode: 'CLIG3', quantity: 2.5, unit: 'ha' }

const supplementsFor = (overrides = {}) =>
  getSupplementsWithAvailability({
    baseAction,
    supplementActions,
    ...overrides
  })

describe('getSupplementsWithAvailability', () => {
  test('returns every supplement, available up to the area of the base action', () => {
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

  test('reports availability in square metres for a supplement measured in them', () => {
    const [supplement] = supplementsFor({
      supplementActions: [supplementAction('GRH7', 'sqm')]
    })

    expect(supplement.availability).toEqual({ unit: 'sqm', value: 25000 })
  })

  test('converts a base action given in square metres', () => {
    const [supplement] = supplementsFor({
      baseAction: { actionCode: 'CLIG3', quantity: 25000, unit: 'sqm' }
    })

    expect(supplement.availability).toEqual({ unit: 'ha', value: 2.5 })
  })

  test('returns no supplements when the base action has none', () => {
    expect(supplementsFor({ supplementActions: [] })).toEqual([])
  })
})
