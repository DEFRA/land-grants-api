import {
  executeRules,
  executeSingleRuleForEnabledActions
} from './rulesEngine.js'
import { mockActionConfig } from '../api/actions/fixtures/index.js'
import { vi, beforeEach } from 'vitest'

const rules = {
  'parcel-has-intersection-with-data-layer-1.0.0': {
    execute: () => {
      return {
        name: 'parcel-has-intersection-with-data-layer',
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
  areaAppliedFor: 100,
  actionCodeAppliedFor: 'GRH7',
  landParcel: {
    area: 100,
    existingAgreements: [{ area: 100, code: 'LIG2' }],
    intersections: {
      moorland: { intersectingAreaPercentage: 50 }
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
    const result = executeRules(rules, application, mockActionConfig[0].rules)

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
        execute: () => {
          return {
            name: 'parcel-has-intersection-with-data-layer',
            passed: true,
            message: 'Success'
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

    const result = executeRules(
      rulesWithMixedResults,
      application,
      mockActionConfig[0].rules
    )

    expect(result).toStrictEqual({
      passed: false,
      results: [
        {
          name: 'parcel-has-intersection-with-data-layer',
          passed: true,
          message: 'Success'
        },
        {
          name: 'applied-for-total-available-area',
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
    const enabledActions = [
      {
        code: 'CMOR1',
        enabled: true,
        display: true,
        rules: [
          {
            name: 'sssi-consent-required',
            config: { layerName: 'sssi', tolerancePercent: 0 }
          }
        ]
      },
      {
        code: 'UPL1',
        enabled: true,
        display: true,
        rules: [
          {
            name: 'sssi-consent-required',
            config: { layerName: 'sssi', tolerancePercent: 0 }
          }
        ]
      },
      {
        code: 'UPL2',
        enabled: true,
        display: false,
        rules: [
          {
            name: 'sssi-consent-required',
            config: { layerName: 'sssi', tolerancePercent: 0 }
          }
        ]
      },
      {
        code: 'DISABLED1',
        enabled: false,
        display: true,
        rules: [
          {
            name: 'sssi-consent-required',
            config: { layerName: 'sssi', tolerancePercent: 0 }
          }
        ]
      }
    ]

    const mockRuleExecutor = {
      execute: vi.fn(() => ({
        name: 'sssi-consent-required-sssi',
        passed: true,
        reason: 'No consent required',
        description: 'SSSI consent check',
        explanations: [],
        cavets: { isConsentRequired: false }
      }))
    }

    beforeEach(function () {
      mockRuleExecutor.execute.mockClear()
    })

    test('should return results for enabled and display actions only', function () {
      const result = executeSingleRuleForEnabledActions(
        enabledActions,
        application,
        'sssi-consent-required',
        mockRuleExecutor
      )

      expect(result).toHaveProperty('CMOR1')
      expect(result).toHaveProperty('UPL1')
      expect(result).not.toHaveProperty('UPL2')
      expect(result).not.toHaveProperty('DISABLED1')
    })

    test('should execute rule for each matching enabled action', function () {
      executeSingleRuleForEnabledActions(
        enabledActions,
        application,
        'sssi-consent-required',
        mockRuleExecutor
      )

      expect(mockRuleExecutor.execute).toHaveBeenCalledTimes(2)
      expect(mockRuleExecutor.execute).toHaveBeenCalledWith(
        application,
        enabledActions[0].rules[0]
      )
      expect(mockRuleExecutor.execute).toHaveBeenCalledWith(
        application,
        enabledActions[1].rules[0]
      )
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
        actionsWithoutRule,
        application,
        'sssi-consent-required',
        mockRuleExecutor
      )

      expect(result).toStrictEqual({
        NO_RULE1: false
      })
      expect(mockRuleExecutor.execute).not.toHaveBeenCalled()
    })

    test('should return empty object for empty enabledActions array', function () {
      const result = executeSingleRuleForEnabledActions(
        [],
        application,
        'sssi-consent-required',
        mockRuleExecutor
      )

      expect(result).toStrictEqual({})
      expect(mockRuleExecutor.execute).not.toHaveBeenCalled()
    })

    test('should return empty object when no actions are enabled and display', function () {
      const allDisabledActions = [
        {
          code: 'DISABLED1',
          enabled: false,
          display: true,
          rules: [
            {
              name: 'sssi-consent-required',
              config: { layerName: 'sssi', tolerancePercent: 0 }
            }
          ]
        },
        {
          code: 'HIDDEN1',
          enabled: true,
          display: false,
          rules: [
            {
              name: 'sssi-consent-required',
              config: { layerName: 'sssi', tolerancePercent: 0 }
            }
          ]
        }
      ]

      const result = executeSingleRuleForEnabledActions(
        allDisabledActions,
        application,
        'sssi-consent-required',
        mockRuleExecutor
      )

      expect(result).toStrictEqual({})
      expect(mockRuleExecutor.execute).not.toHaveBeenCalled()
    })

    test('should handle actions with no rules array', function () {
      const actionsWithoutRules = [
        {
          code: 'NO_RULES1',
          enabled: true,
          display: true
        }
      ]

      const result = executeSingleRuleForEnabledActions(
        actionsWithoutRules,
        application,
        'sssi-consent-required',
        mockRuleExecutor
      )

      expect(result).toStrictEqual({
        NO_RULES1: false
      })
      expect(mockRuleExecutor.execute).not.toHaveBeenCalled()
    })

    test('should match rule name as string', function () {
      const actionsWithNumericRuleName = [
        {
          code: 'NUMERIC_RULE1',
          enabled: true,
          display: true,
          rules: [
            {
              name: 123,
              config: { layerName: 'sssi', tolerancePercent: 0 }
            }
          ]
        }
      ]

      const result = executeSingleRuleForEnabledActions(
        actionsWithNumericRuleName,
        application,
        '123',
        mockRuleExecutor
      )

      expect(result).toHaveProperty('NUMERIC_RULE1')
      expect(mockRuleExecutor.execute).toHaveBeenCalledTimes(1)
    })
  })
})
