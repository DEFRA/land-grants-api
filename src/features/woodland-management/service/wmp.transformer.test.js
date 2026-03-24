import { wmpResultTransformer } from './wmp.transformer.js'

describe('wmpResultTransformer', () => {
  it('should transform result correctly', () => {
    const action = {
      code: 'ACTION_1',
      semanticVersion: '1.0.0'
    }
    const ruleResult = {
      passed: true,
      results: [{ ruleId: 'rule1', passed: true }]
    }

    const result = wmpResultTransformer(action, ruleResult)

    expect(result).toEqual({
      hasPassed: true,
      code: 'ACTION_1',
      actionConfigVersion: '1.0.0',
      rules: [{ ruleId: 'rule1', passed: true }]
    })
  })
})
