import {
  executeMinimumLengthRule,
  findMinimumLengthRule
} from './minimum-length-rule.js'

const minimumLength = (minimumLengthM, overrides = {}) => ({
  name: 'minimum-length',
  description: `Is the applied for length at least ${minimumLengthM} m?`,
  config: { minimumLengthM },
  ...overrides
})

const availableLengthRule = {
  name: 'applied-for-total-or-partial-available-length',
  description: 'Is the applied for length no more than the available length?',
  config: {}
}

const consentRule = {
  name: 'sssi-consent-required',
  type: 'boundary-intersection-consent-required',
  description: 'Is consent needed from Natural England?',
  config: { layerName: 'sssi' }
}

describe('findMinimumLengthRule', () => {
  test('should find a minimum-length rule by its name', () => {
    const rule = minimumLength(20)

    const found = findMinimumLengthRule({ rules: [consentRule, rule] })

    expect(found).toBe(rule)
  })

  test('should find a minimum-length rule configured under another name by its type', () => {
    const rule = minimumLength(20, {
      name: 'wall-minimum',
      type: 'minimum-length'
    })

    const found = findMinimumLengthRule({ rules: [rule] })

    expect(found).toBe(rule)
  })

  test('should not let an available length rule listed first hide the minimum', () => {
    const rule = minimumLength(20)

    const found = findMinimumLengthRule({ rules: [availableLengthRule, rule] })

    expect(found).toBe(rule)
  })

  test('should find nothing for an action whose rules gate nothing on length', () => {
    const found = findMinimumLengthRule({
      rules: [consentRule, availableLengthRule]
    })

    expect(found).toBeUndefined()
  })

  test('should find nothing for an action with no rules', () => {
    const found = findMinimumLengthRule({})

    expect(found).toBeUndefined()
  })
})

describe('executeMinimumLengthRule', () => {
  const BOUNDARY_METERS = 1800

  const leaving = (claimableMeters) => ({
    availableLength: claimableMeters,
    boundaryLengthMeters: BOUNDARY_METERS,
    incompatibleLengthMeters: BOUNDARY_METERS - claimableMeters,
    incompatibleActions: [],
    exceedsBoundary: false
  })

  test('should pass when what is left is more than the minimum', () => {
    const rule = minimumLength(20)
    const availableLength = leaving(240)

    const result = executeMinimumLengthRule(rule, 'BND1', availableLength)

    expect(result.passed).toBe(true)
  })

  test('should pass when what is left is exactly the minimum', () => {
    const rule = minimumLength(20)
    const availableLength = leaving(20)

    const result = executeMinimumLengthRule(rule, 'BND1', availableLength)

    expect(result.passed).toBe(true)
  })

  test("should fail in the rule's own words, with its minimum, when what is left falls short", () => {
    const rule = minimumLength(20)
    const availableLength = leaving(12)

    const result = executeMinimumLengthRule(rule, 'BND1', availableLength)

    expect(result).toEqual({
      passed: false,
      reason:
        'The minimum allowable length for this action (20 m) is more than the available length for this land parcel (12 m)',
      minimumLengthMeters: 20
    })
  })
})
