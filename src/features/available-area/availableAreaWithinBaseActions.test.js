import { findAvailableAreaWithinBaseActions } from './availableAreaWithinBaseActions.js'
import { haToSqm } from '~/src/features/common/helpers/measurement.js'

// Real 2026 rows: GRH7 and GRH8 have CLIG3 as their base, SPM3 has CLIG3 and
// AGF1, and GRH7 and GRH11 can stack (SUPCO)
const BASE_CODES = {
  GRH7: new Set(['CLIG3']),
  GRH8: new Set(['CLIG3']),
  GRH11: new Set(['CLIG3']),
  SPM3: new Set(['CLIG3', 'AGF1'])
}
const baseCodesOf = (code) => BASE_CODES[code] ?? new Set()
const stacking = [['GRH7', 'GRH11']]
const compatibilityCheckFn = (a, b) =>
  stacking.some(([x, y]) => (x === a && y === b) || (x === b && y === a))

const ha = (actionCode, quantity) => ({
  actionCode,
  areaSqm: haToSqm(quantity)
})

// The actions on the parcel are given as one list, as the parcel-level
// calculation is given them
const availableHa = (code, others, bases) =>
  findAvailableAreaWithinBaseActions(
    code,
    [...bases, ...others],
    baseCodesOf,
    compatibilityCheckFn
  ).availableAreaSqm / 10000

describe('findAvailableAreaWithinBaseActions', () => {
  test('leaves out the actions on the parcel that are neither a base nor a supplement', () => {
    // CAGF1 competes for the parcel, which the parcel-level calculation counts
    expect(availableHa('GRH7', [ha('CAGF1', 4)], [ha('CLIG3', 10)])).toBe(10)
  })

  test('counts the supplement against itself, leaving what is left on top of its selection', () => {
    expect(availableHa('GRH7', [ha('GRH7', 6)], [ha('CLIG3', 10)])).toBe(4)
  })

  test('leaves out a base action only of supplements not on the parcel', () => {
    // GRH12 has no base here; AGF1 is a base of SPM3 only, which is not planned
    expect(availableHa('GRH7', [], [ha('CLIG3', 5), ha('AGF1', 3)])).toBe(5)
  })

  test('gives the whole base action when no other supplement is on it', () => {
    expect(availableHa('GRH7', [], [ha('CLIG3', 10)])).toBe(10)
  })

  test('leaves what a supplement it cannot stack with leaves of the base', () => {
    expect(availableHa('GRH7', [ha('GRH8', 4)], [ha('CLIG3', 10)])).toBe(6)
  })

  test('lets supplements that can stack use the whole base', () => {
    expect(availableHa('GRH7', [ha('GRH11', 4)], [ha('CLIG3', 10)])).toBe(10)
  })

  test('counts the supplements it cannot stack with, but not those it can', () => {
    expect(
      availableHa('GRH7', [ha('GRH8', 4), ha('GRH11', 6)], [ha('CLIG3', 10)])
    ).toBe(6)
  })

  test('only counts the area of its own base actions', () => {
    // AGF1 is not a base of GRH7
    expect(availableHa('GRH7', [], [ha('CLIG3', 5), ha('AGF1', 3)])).toBe(5)
  })

  test('takes the areas of several base actions as separate', () => {
    expect(availableHa('SPM3', [], [ha('CLIG3', 5), ha('AGF1', 3)])).toBe(8)
  })

  test('places another supplement on the base it does not share where it can', () => {
    // SPM3 can use AGF1 as well, so GRH7 keeps all of CLIG3
    expect(
      availableHa('GRH7', [ha('SPM3', 3)], [ha('CLIG3', 5), ha('AGF1', 3)])
    ).toBe(5)
  })

  test('leaves nothing when the base action has no base on the parcel', () => {
    expect(availableHa('GRH7', [], [ha('AGF1', 3)])).toBe(0)
  })

  test('leaves nothing, and is infeasible, when the others do not fit the base', () => {
    const result = findAvailableAreaWithinBaseActions(
      'GRH7',
      [ha('CLIG3', 10), ha('GRH8', 12)],
      baseCodesOf,
      compatibilityCheckFn
    )

    expect(result).toEqual({ feasible: false, availableAreaSqm: 0 })
  })
})
