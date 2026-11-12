import { getSupplementsWithAvailability } from './supplements.service.js'
import { EXCEEDS_BASE_ACTION_AREA } from '~/src/features/parcel/constants/unavailable-reasons.js'

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

const supplementsFor = (selectedSupplements, overrides = {}) =>
  getSupplementsWithAvailability({
    baseAction,
    selectedSupplements,
    supplementActions,
    ...overrides
  })

const byCode = (supplements) =>
  Object.fromEntries(supplements.map((s) => [s.code, s]))

describe('getSupplementsWithAvailability', () => {
  test('returns every supplement, available up to the area of the base action', () => {
    const supplements = supplementsFor([])

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
    const [supplement] = supplementsFor([], {
      supplementActions: [supplementAction('GRH7', 'sqm')]
    })

    expect(supplement.availability).toEqual({ unit: 'sqm', value: 25000 })
  })

  test('converts a base action given in square metres', () => {
    const [supplement] = supplementsFor([], {
      baseAction: { actionCode: 'CLIG3', quantity: 25000, unit: 'sqm' }
    })

    expect(supplement.availability).toEqual({ unit: 'ha', value: 2.5 })
  })

  // GRH7 and GRH8 cannot overlap but can share the base action's area. Until
  // that is worked out, selected supplements do not reduce each other's availability
  test('leaves each selected supplement available up to the whole base action area', () => {
    const supplements = byCode(
      supplementsFor([
        { actionCode: 'GRH7', quantity: 1.5, unit: 'ha' },
        { actionCode: 'GRH8', quantity: 1, unit: 'ha' }
      ])
    )

    for (const code of ['GRH7', 'GRH8', 'GRH11']) {
      expect(supplements[code]).toEqual(
        expect.objectContaining({
          availability: { unit: 'ha', value: 2.5 },
          isAvailable: true
        })
      )
    }
  })

  test('accepts a selected supplement covering all of the base action', () => {
    const supplements = byCode(
      supplementsFor([{ actionCode: 'GRH7', quantity: 25000, unit: 'sqm' }])
    )

    expect(supplements.GRH7.isAvailable).toBe(true)
  })

  test('marks a selected supplement covering more than the base action unavailable', () => {
    const supplements = byCode(
      supplementsFor([{ actionCode: 'GRH11', quantity: 3, unit: 'ha' }])
    )

    expect(supplements.GRH11).toEqual(
      expect.objectContaining({
        isAvailable: false,
        unavailableReason: expect.objectContaining({
          code: EXCEEDS_BASE_ACTION_AREA,
          metadata: {
            baseActionCode: 'CLIG3',
            baseActionAreaHa: 2.5,
            selectedAreaHa: 3
          }
        })
      })
    )
    expect(supplements.GRH7.isAvailable).toBe(true)
  })

  test('returns no supplements when the base action has none', () => {
    expect(supplementsFor([], { supplementActions: [] })).toEqual([])
  })
})
