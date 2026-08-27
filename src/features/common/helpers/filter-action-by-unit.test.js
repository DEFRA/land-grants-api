import { test } from 'vitest'
import { createFilterActionByUnit } from './filter-action-by-unit.js'

describe('createFilterActionByUnit', () => {
  test('should return a function', () => {
    expect(typeof createFilterActionByUnit([], 'M')).toBe('function')
  })

  test('should return actions filtered by unit', () => {
    const actions = [
      {
        code: 'CMOR1',
        applicationUnitOfMeasurement: 'M'
      }
    ]
    const filter = createFilterActionByUnit(actions, 'M')
    const filtered = actions.filter(filter)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].code).toBe('CMOR1')
  })

  test('should return no actions when unit cannot be matched', () => {
    const actions = [
      {
        code: 'CMOR1',
        applicationUnitOfMeasurement: 'M'
      }
    ]
    const filter = createFilterActionByUnit(actions, 'H')
    const filtered = actions.filter(filter)
    expect(filtered).toHaveLength(0)
  })

  test('should return all actions when code cannot be matched', () => {
    const actions = [
      {
        code: 'CMOR1',
        applicationUnitOfMeasurement: 'M'
      }
    ]
    const filter = createFilterActionByUnit(actions, 'M', 'CMOR2')
    const filtered = actions.filter(filter)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].code).toBe('CMOR1')
  })
})
