import { ruleConfigs, ruleSchema } from './schemas.js'
import { rules } from './index.js'

const ruleNames = () =>
  Object.keys(rules).map((key) => key.replace(/-1\.0\.0$/, ''))

describe('rule config schemas', () => {
  test('every registered rule has a schema, and every schema a rule', () => {
    expect(Object.keys(ruleConfigs).sort()).toEqual(ruleNames().sort())
  })

  test('rejects a rule the engine does not have', () => {
    expect(
      ruleSchema.validate({ name: 'made-up-rule', description: 'x' }).error
        .message
    ).toContain('"name" must be one of')
  })

  test('rejects missing and unknown config for a rule', () => {
    const rule = {
      name: 'sssi-consent-required',
      description: 'x',
      config: { layerName: 'sssi', caveatDescription: 'y', tolerancePercent: 1 }
    }

    expect(ruleSchema.validate(rule).error).toBeUndefined()
    expect(
      ruleSchema.validate({ ...rule, config: { layerName: 'sssi' } }).error
        .message
    ).toContain('"config.caveatDescription" is required')
    expect(
      ruleSchema.validate({ ...rule, config: { ...rule.config, typo: 1 } })
        .error.message
    ).toContain('"config.typo" is not allowed')
  })
})
