import { executeRules } from './rulesEngine.js'
import { mockActions } from '../api/actions/fixtures/index.js'

const rules = {
  'parcel-has-intersection-with-data-layer': {
    execute: () => {
      return {
        passed: true,
        message: 'Success'
      }
    }
  },
  'applied-for-total-available-area': {
    execute: () => {
      return {
        passed: true,
        message: 'Success'
      }
    }
  }
}

const application = {
  areaAppliedFor: 100,
  actionCodeAppliedFor: 'GRH7',
  landParcel: {
    area: 100,
    existingAgreements: [{ area: 100, code: 'LIG2' }],
    intersections: {
      sssi: 0,
      monument: 0,
      moorland: 0,
      lfa: 0,
      landParcel: 100
    }
  }
}

describe('Rules Engine', function () {
  test('should return passed=true if a single rule is valid', function () {
    const result = executeRules(rules, application, [mockActions[0].rules[0]])

    expect(result).toStrictEqual({
      passed: true,
      results: [
        {
          name: 'parcel-has-intersection-with-data-layer',
          passed: true,
          message: 'Success'
        }
      ]
    })
  })

  test('should return passed=true if all rules are valid', function () {
    const result = executeRules(rules, application, mockActions[0].rules)

    expect(result).toStrictEqual({
      passed: true,
      results: [
        {
          name: 'parcel-has-intersection-with-data-layer',
          passed: true,
          message: 'Success'
        },
        {
          name: 'applied-for-total-available-area',
          passed: true,
          message: 'Success'
        }
      ]
    })
  })

  test('should return passed=false if missing rules', function () {
    const result = executeRules(rules, application, [
      { name: 'missing-rule', config: {} }
    ])

    expect(result).toStrictEqual({
      passed: false,
      results: [
        { name: 'missing-rule', passed: false, message: 'Rule not found' }
      ]
    })
  })

  test('should return passed=false if mixed response with valid and missing rules', function () {
    const result = executeRules(rules, application, [
      mockActions[0].rules[0],
      { name: 'missing-rule', config: {} }
    ])

    expect(result).toStrictEqual({
      passed: false,
      results: [
        {
          name: 'parcel-has-intersection-with-data-layer',
          passed: true,
          message: 'Success'
        },
        { name: 'missing-rule', passed: false, message: 'Rule not found' }
      ]
    })
  })

  test('should return passed=false if no rules are provided', function () {
    const result = executeRules(rules, application, [])

    expect(result).toStrictEqual({
      passed: false,
      results: []
    })
  })
})
