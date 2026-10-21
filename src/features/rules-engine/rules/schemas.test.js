import { ruleConfigs, ruleSchema } from './schemas.js'
import { rules } from './index.js'

// Real rule keys, since the schema only accepts rules the engine has
const ruleRunByName = {
  name: 'sssi-consent-required',
  description: 'example description',
  config: {
    layerName: 'example layer name',
    caveatDescription: 'example caveat description',
    tolerancePercent: 1
  }
}

const ruleRunByType = {
  name: 'made-up-rule-name',
  type: 'manual-check-required',
  description: 'example description',
  config: { caveatDescription: 'example caveat description' }
}

describe('ruleConfigs', () => {
  test('is keyed the same way as the rules engine registry', () => {
    expect(Object.keys(ruleConfigs).sort()).toEqual(Object.keys(rules).sort())
  })
})

describe('ruleSchema', () => {
  describe('works out the rule key the way the engine does, by ruleKeyFor(rule)', () => {
    test('from the name when there is no type', () => {
      const { error } = ruleSchema.validate({
        name: 'made-up-rule-name',
        description: 'example description'
      })

      expect(error?.message).toContain(
        '"made-up-rule-name-1.0.0" is an unknown rule'
      )
    })

    test('from the type over the name', () => {
      const { error } = ruleSchema.validate({
        name: 'made-up-rule-name',
        type: 'made-up-rule-type',
        description: 'example description'
      })

      expect(error?.message).toContain(
        '"made-up-rule-type-1.0.0" is an unknown rule'
      )
    })

    test('from the version when there is one', () => {
      const { error } = ruleSchema.validate({
        ...ruleRunByName,
        version: '2.0.0'
      })

      expect(error?.message).toContain(
        '"sssi-consent-required-2.0.0" is an unknown rule'
      )
    })
  })

  describe('checks config against the schema for that rule key', () => {
    test('accepts config that suits the rule named', () => {
      const { error } = ruleSchema.validate(ruleRunByName)

      expect(error).toBeUndefined()
    })

    test('accepts config that suits the rule typed', () => {
      const { error } = ruleSchema.validate(ruleRunByType)

      expect(error).toBeUndefined()
    })

    test("uses the type's schema, not the name's", () => {
      const { error } = ruleSchema.validate({
        name: 'sssi-consent-required',
        type: 'manual-check-required',
        description: 'example description',
        config: {
          layerName: 'example layer name',
          caveatDescription: 'example caveat description',
          tolerancePercent: 1
        }
      })

      expect(error?.message).toContain('"config.layerName" is not allowed')
    })

    test('rejects a missing config field', () => {
      const { error } = ruleSchema.validate({
        ...ruleRunByName,
        config: { layerName: 'example layer name' }
      })

      expect(error?.message).toContain('"config.caveatDescription" is required')
    })

    test('rejects an unknown config field', () => {
      const { error } = ruleSchema.validate({
        ...ruleRunByName,
        config: { ...ruleRunByName.config, typo: 1 }
      })

      expect(error?.message).toContain('"config.typo" is not allowed')
    })

    test('requires config for a rule that reads it', () => {
      const { error } = ruleSchema.validate({
        ...ruleRunByName,
        config: undefined
      })

      expect(error?.message).toContain('"config" is required')
    })

    test('forbids config for a rule that reads none', () => {
      const { error } = ruleSchema.validate({
        name: 'applied-for-total-available-area',
        description: 'example description',
        config: {}
      })

      expect(error?.message).toContain('"config" is not allowed')
    })

    test('allows config to be left out where the rule makes it optional', () => {
      const { error } = ruleSchema.validate({
        name: 'parcel-has-valid-land-cover',
        description: 'example description'
      })

      expect(error).toBeUndefined()
    })
  })
})
