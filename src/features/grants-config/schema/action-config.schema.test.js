import { validateActionConfig } from './action-config.schema.js'

describe('validateActionConfig', () => {
  const actionConfig = {
    applicationUnitOfMeasurement: 'ha',
    code: 'PA3',
    description: 'Woodland management plan',
    display: false,
    displayOrder: 0,
    durationYears: 10,
    enabled: true,
    groupId: null,
    payment: null,
    paymentMethod: { name: 'wmp-calculation' },
    rules: [],
    semanticVersion: '1.0.0',
    startDate: '2025-01-01'
  }

  const problemsIn = (error) =>
    error.details.map(({ path, type }) => ({ path, type }))

  test('accepts a complete action config', () => {
    const { error } = validateActionConfig(actionConfig)

    expect(error).toBeUndefined()
  })

  test('reports every missing required field, not just the first', () => {
    const { error } = validateActionConfig({
      ...actionConfig,
      code: undefined,
      semanticVersion: undefined
    })

    expect(problemsIn(error)).toEqual([
      { path: ['code'], type: 'any.required' },
      { path: ['semanticVersion'], type: 'any.required' }
    ])
  })

  test('reports a rule the rules engine does not have by its rule key', () => {
    const { error } = validateActionConfig({
      ...actionConfig,
      rules: [{ name: 'made-up-rule', description: 'desc' }]
    })

    const [problem] = error.details
    expect(problem.context.ruleKey).toBe('made-up-rule-1.0.0')
  })
})
