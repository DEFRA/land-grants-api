import { getActions } from './getActions.query.js'

describe('getActions', () => {
  it('should return an array of actions', () => {
    const actions = getActions()

    expect(Array.isArray(actions)).toBe(true)
    expect(actions.length).toBeGreaterThan(0)
  })

  it('should return actions with correct structure', () => {
    const actions = getActions()
    const firstAction = actions[0]

    expect(firstAction).toHaveProperty('code')
    expect(firstAction).toHaveProperty('description')
    expect(firstAction).toHaveProperty('availableArea')
    expect(firstAction.availableArea).toHaveProperty('unit')
    expect(firstAction.availableArea).toHaveProperty('value')
  })

  it('should return the correct action data', () => {
    const actions = getActions()
    const firstAction = actions[0]

    expect(firstAction.code).toBe('CSAM1')
    expect(firstAction.description).toBe(
      'CSAM1: Assess soil, produce a soil management plan and test soil organic matter'
    )
    expect(firstAction.availableArea.unit).toBe('ha')
    expect(firstAction.availableArea.value).toBe(0)
  })
})
