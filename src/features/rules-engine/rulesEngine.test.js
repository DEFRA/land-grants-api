import {
  executeRules,
  executeSingleRuleForEnabledActions
} from '~/src/features/rules-engine/rulesEngine.js'
import { mockActionConfig } from '~/src/features/actions/fixtures/index.js'

const rules = {
  'parcel-has-intersection-with-data-layer-1.0.0': {
    execute: (_application, rule) => {
      return {
        name: rule.name,
        passed: true,
        message: 'Success'
      }
    }
  },
  'sssi-consent-required-1.0.0': {
    execute: (_application, rule) => {
      return {
        name: rule.name,
        passed: true,
        message: 'Success'
      }
    }
  },
  'applied-for-total-available-area-1.0.0': {
    execute: () => {
      return {
        name: 'applied-for-total-available-area',
        passed: true,
        message: 'Success'
      }
    }
  }
}

const application = {
  appliedForQuantity: 100,
  actionCodeAppliedFor: 'GRH7',
  landParcel: {
    area: 100,
    existingAgreements: [{ area: 100, code: 'LIG2' }],
    intersections: {
      moorland: { intersectingAreaPercentage: 50 },
      lfa: { intersectingAreaPercentage: 100 }
    }
  }
}

describe('Rules Engine', function () {
  test('should return passed=true if a single rule is valid', function () {
    const result = executeRules(rules, application, [
      mockActionConfig[0].rules[0]
    ])

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
    const result = executeRules(rules, application, [
      mockActionConfig[0].rules[0],
      mockActionConfig[0].rules[1],
      mockActionConfig[0].rules[2]
    ])

    expect(result).toStrictEqual({
      passed: true,
      results: [
        {
          name: 'parcel-has-intersection-with-data-layer',
          passed: true,
          message: 'Success'
        },
        {
          name: 'parcel-is-on-less-favoured-area',
          passed: true,
          message: 'Success'
        },
        {
          name: 'sssi-consent-required',
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
      mockActionConfig[0].rules[0],
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

  test('should return passed=false if a rule returns passed=false', function () {
    const rulesWithFailure = {
      'parcel-has-intersection-with-data-layer-1.0.0': {
        execute: () => {
          return {
            name: 'parcel-has-intersection-with-data-layer',
            passed: false,
            message: 'Rule failed'
          }
        }
      }
    }

    const result = executeRules(rulesWithFailure, application, [
      mockActionConfig[0].rules[0]
    ])

    expect(result).toStrictEqual({
      passed: false,
      results: [
        {
          name: 'parcel-has-intersection-with-data-layer',
          passed: false,
          message: 'Rule failed'
        }
      ]
    })
  })

  test('should return passed=false if any rule returns passed=false', function () {
    const rulesWithMixedResults = {
      'parcel-has-intersection-with-data-layer-1.0.0': {
        execute: (_application, rule) => {
          return {
            name: rule.name,
            passed: true,
            message: 'Success'
          }
        }
      },
      'sssi-consent-required-1.0.0': {
        execute: () => {
          return {
            name: 'sssi-consent-required',
            passed: false,
            message: 'Failed'
          }
        }
      },
      'applied-for-total-available-area-1.0.0': {
        execute: () => {
          return {
            name: 'applied-for-total-available-area',
            passed: false,
            message: 'Failed'
          }
        }
      }
    }

    const result = executeRules(rulesWithMixedResults, application, [
      mockActionConfig[0].rules[0],
      mockActionConfig[0].rules[1],
      mockActionConfig[0].rules[2]
    ])

    expect(result).toStrictEqual({
      passed: false,
      results: [
        {
          name: 'parcel-has-intersection-with-data-layer',
          passed: true,
          message: 'Success'
        },
        {
          name: 'parcel-is-on-less-favoured-area',
          passed: true,
          message: 'Success'
        },
        {
          name: 'sssi-consent-required',
          passed: false,
          message: 'Failed'
        }
      ]
    })
  })

  test('should use custom version when provided in rule', function () {
    const rulesWithCustomVersion = {
      'parcel-has-intersection-with-data-layer-2.0.0': {
        execute: () => {
          return {
            name: 'parcel-has-intersection-with-data-layer',
            passed: true,
            message: 'Success v2'
          }
        }
      }
    }

    const result = executeRules(rulesWithCustomVersion, application, [
      { name: 'parcel-has-intersection-with-data-layer', version: '2.0.0' }
    ])

    expect(result).toStrictEqual({
      passed: true,
      results: [
        {
          name: 'parcel-has-intersection-with-data-layer',
          passed: true,
          message: 'Success v2'
        }
      ]
    })
  })

  test('should dispatch by rule.type when present, ignoring rule.name for lookup', function () {
    const rulesWithGenericExecutor = {
      'manual-check-required-1.0.0': {
        execute: (application, rule) => ({
          name: rule.name,
          passed: true,
          caveat: { code: rule.name }
        })
      }
    }

    const result = executeRules(rulesWithGenericExecutor, application, [
      {
        name: 'pond-check-required',
        type: 'manual-check-required',
        config: { caveatDescription: 'A manual pond check is required' }
      }
    ])

    expect(result).toStrictEqual({
      passed: true,
      results: [
        {
          name: 'pond-check-required',
          passed: true,
          caveat: { code: 'pond-check-required' }
        }
      ]
    })
  })

  test('should fall back to rule.name for dispatch when rule.type is absent', function () {
    const result = executeRules(rules, application, [
      mockActionConfig[0].rules[0]
    ])

    expect(result.passed).toBe(true)
  })

  test('should pass application and rule to execute function', function () {
    const mockExecute = vi.fn(() => ({
      name: 'test-rule',
      passed: true,
      message: 'Success'
    }))

    const rulesWithMock = {
      'test-rule-1.0.0': {
        execute: mockExecute
      }
    }

    const testRule = { name: 'test-rule', config: { test: 'config' } }
    executeRules(rulesWithMock, application, [testRule])

    expect(mockExecute).toHaveBeenCalledTimes(1)
    expect(mockExecute).toHaveBeenCalledWith(application, testRule)
  })

  describe('executeSingleRuleForEnabledActions', function () {
    const sssiRule = {
      name: 'sssi-consent-required',
      config: { layerName: 'sssi', tolerancePercent: 0 }
    }

    const enabledActions = [
      { code: 'CMOR1', enabled: true, display: true, rules: [sssiRule] },
      { code: 'UPL1', enabled: true, display: true, rules: [sssiRule] },
      { code: 'UPL2', enabled: true, display: false, rules: [sssiRule] },
      { code: 'DISABLED1', enabled: false, display: true, rules: [sssiRule] }
    ]

    const mockRuleExecutor = {
      execute: vi.fn(() => ({
        name: 'sssi-consent-required',
        passed: true,
        reason: 'No consent required',
        description: 'SSSI consent check',
        explanations: []
      }))
    }

    const registry = { 'sssi-consent-required-1.0.0': mockRuleExecutor }

    beforeEach(function () {
      mockRuleExecutor.execute.mockClear()
    })

    test('should return results for enabled and display actions only', function () {
      const result = executeSingleRuleForEnabledActions(
        registry,
        enabledActions,
        application,
        'sssi-consent-required'
      )

      expect(Object.keys(result)).toStrictEqual(['CMOR1', 'UPL1'])
    })

    test('should execute rule for each matching enabled action', function () {
      executeSingleRuleForEnabledActions(
        registry,
        enabledActions,
        application,
        'sssi-consent-required'
      )

      expect(mockRuleExecutor.execute.mock.calls).toStrictEqual([
        [application, sssiRule],
        [application, sssiRule]
      ])
    })

    test('should dispatch by rule.type when present, so two actions naming the same rule can reach different executors', function () {
      const boundaryRule = {
        name: 'sssi-consent-required',
        type: 'boundary-intersection-consent-required',
        config: { layerName: 'sssi', toleranceMeters: 0 }
      }
      const registryWithBoundaryExecutor = {
        'sssi-consent-required-1.0.0': {
          execute: () => ({ name: 'sssi-consent-required', executor: 'area' })
        },
        'boundary-intersection-consent-required-1.0.0': {
          execute: () => ({
            name: 'sssi-consent-required',
            executor: 'boundary'
          })
        }
      }

      const result = executeSingleRuleForEnabledActions(
        registryWithBoundaryExecutor,
        [
          { code: 'UPL1', enabled: true, display: true, rules: [sssiRule] },
          { code: 'BND1', enabled: true, display: true, rules: [boundaryRule] }
        ],
        application,
        'sssi-consent-required'
      )

      expect(result).toStrictEqual({
        UPL1: { name: 'sssi-consent-required', executor: 'area' },
        BND1: { name: 'sssi-consent-required', executor: 'boundary' }
      })
    })

    test('should use custom version when provided in rule', function () {
      const versionedRule = { ...sssiRule, version: '2.0.0' }
      const registryWithV2 = {
        'sssi-consent-required-2.0.0': {
          execute: () => ({ name: 'sssi-consent-required', version: 'v2' })
        }
      }

      const result = executeSingleRuleForEnabledActions(
        registryWithV2,
        [
          { code: 'UPL1', enabled: true, display: true, rules: [versionedRule] }
        ],
        application,
        'sssi-consent-required'
      )

      expect(result).toStrictEqual({
        UPL1: { name: 'sssi-consent-required', version: 'v2' }
      })
    })

    test('should return false for actions whose rule has no registered executor', function () {
      const result = executeSingleRuleForEnabledActions(
        {},
        [{ code: 'UPL1', enabled: true, display: true, rules: [sssiRule] }],
        application,
        'sssi-consent-required'
      )

      expect(result).toStrictEqual({ UPL1: false })
    })

    test('should return false for actions without matching rule', function () {
      const actionsWithoutRule = [
        {
          code: 'NO_RULE1',
          enabled: true,
          display: true,
          rules: [{ name: 'other-rule', config: {} }]
        }
      ]

      const result = executeSingleRuleForEnabledActions(
        registry,
        actionsWithoutRule,
        application,
        'sssi-consent-required'
      )

      expect(result).toStrictEqual({ NO_RULE1: false })
    })

    test('should return empty object for empty enabledActions array', function () {
      const result = executeSingleRuleForEnabledActions(
        registry,
        [],
        application,
        'sssi-consent-required'
      )

      expect(result).toStrictEqual({})
    })

    test('should return empty object when no actions are enabled and display', function () {
      const allDisabledActions = [
        { code: 'DISABLED1', enabled: false, display: true, rules: [sssiRule] },
        { code: 'HIDDEN1', enabled: true, display: false, rules: [sssiRule] }
      ]

      const result = executeSingleRuleForEnabledActions(
        registry,
        allDisabledActions,
        application,
        'sssi-consent-required'
      )

      expect(result).toStrictEqual({})
    })

    test('should handle actions with no rules array', function () {
      const actionsWithoutRules = [
        { code: 'NO_RULES1', enabled: true, display: true }
      ]

      const result = executeSingleRuleForEnabledActions(
        registry,
        actionsWithoutRules,
        application,
        'sssi-consent-required'
      )

      expect(result).toStrictEqual({ NO_RULES1: false })
    })

    test('should match rule name as string', function () {
      const numericRule = { name: 123, config: {} }
      const registryWithNumericName = {
        '123-1.0.0': { execute: () => ({ name: '123', passed: true }) }
      }

      const result = executeSingleRuleForEnabledActions(
        registryWithNumericName,
        [
          {
            code: 'NUMERIC_RULE1',
            enabled: true,
            display: true,
            rules: [numericRule]
          }
        ],
        application,
        '123'
      )

      expect(result).toStrictEqual({
        NUMERIC_RULE1: { name: '123', passed: true }
      })
    })
  })
})
