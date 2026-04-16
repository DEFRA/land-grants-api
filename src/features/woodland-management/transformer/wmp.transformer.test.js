import { wmpResultTransformer } from './wmp.transformer.js'

describe('wmpResultTransformer', () => {
  it('should transform result correctly', () => {
    const action = {
      code: 'PA3',
      semanticVersion: '1.0.0'
    }
    const ruleResult = {
      passed: true,
      results: [{ ruleId: 'rule1', passed: true }]
    }

    const result = wmpResultTransformer(action, ruleResult)

    expect(result).toEqual({
      hasPassed: true,
      code: 'PA3',
      actionConfigVersion: '1.0.0',
      rules: [{ ruleId: 'rule1', passed: true }]
    })
  })

  it('should transform result and default code and version if action is undefined', () => {
    const action = undefined
    const ruleResult = {
      passed: true,
      results: [{ ruleId: 'rule1', passed: true }]
    }

    const result = wmpResultTransformer(action, ruleResult)

    expect(result).toEqual({
      hasPassed: true,
      code: '',
      actionConfigVersion: '',
      rules: [{ ruleId: 'rule1', passed: true }]
    })
  })
})
