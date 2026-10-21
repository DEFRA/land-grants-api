import { ruleKeyFor } from './rule-key.js'

describe('ruleKeyFor', () => {
  it('keys a rule by its name and version', () => {
    expect(ruleKeyFor({ name: 'needs-size', version: '2.0.0' })).toBe(
      'needs-size-2.0.0'
    )
  })

  it('prefers the rule type over its name', () => {
    expect(
      ruleKeyFor({ type: 'needs-size', name: 'ignored', version: '1.0.0' })
    ).toBe('needs-size-1.0.0')
  })

  it('defaults to version 1.0.0', () => {
    expect(ruleKeyFor({ name: 'needs-size' })).toBe('needs-size-1.0.0')
  })
})
