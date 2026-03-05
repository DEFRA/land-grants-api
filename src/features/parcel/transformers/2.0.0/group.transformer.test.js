import { createGroupTransformer } from './group.transformer.js'

describe('createGroupTransformer', () => {
  test('should transform groups and actions into grouped format', () => {
    const groups = [
      { id: 1, name: 'Assess moorland' },
      { id: 2, name: 'Livestock grazing on moorland' }
    ]
    const actions = [
      { groupId: 1, code: 'CMOR1' },
      { groupId: 2, code: 'UPL1' },
      { groupId: 2, code: 'UPL2' },
      { groupId: 2, code: 'UPL3' }
    ]

    const result = createGroupTransformer(groups, actions)

    expect(result).toEqual([
      { name: 'Assess moorland', actions: ['CMOR1'] },
      {
        name: 'Livestock grazing on moorland',
        actions: ['UPL1', 'UPL2', 'UPL3']
      }
    ])
  })

  test('should return single action group', () => {
    const groups = [{ id: 1, name: 'Assess moorland' }]
    const actions = [{ groupId: 1, code: 'CMOR1' }]

    const result = createGroupTransformer(groups, actions)

    expect(result).toEqual([{ name: 'Assess moorland', actions: ['CMOR1'] }])
  })

  test('should return multi-action group', () => {
    const groups = [{ id: 1, name: 'Livestock grazing on moorland' }]
    const actions = [
      { groupId: 1, code: 'UPL1' },
      { groupId: 1, code: 'UPL2' }
    ]

    const result = createGroupTransformer(groups, actions)

    expect(result).toEqual([
      {
        name: 'Livestock grazing on moorland',
        actions: ['UPL1', 'UPL2']
      }
    ])
  })

  test('should return empty array when groups is null', () => {
    const result = createGroupTransformer(null, [])

    expect(result).toEqual([])
  })

  test('should return empty array when groups is undefined', () => {
    const result = createGroupTransformer(undefined, [])

    expect(result).toEqual([])
  })

  test('should return empty array when groups is empty array', () => {
    const result = createGroupTransformer([], [])

    expect(result).toEqual([])
  })

  test('should return empty array when actions is null or undefined', () => {
    const groups = [{ id: 1, name: 'Assess moorland' }]
    expect(createGroupTransformer(groups, null)).toEqual([])
    expect(createGroupTransformer(groups, undefined)).toEqual([])
  })

  test('should preserve group order from groups array', () => {
    const groups = [
      { id: 2, name: 'Group B' },
      { id: 1, name: 'Group A' },
      { id: 3, name: 'Group C' }
    ]
    const actions = [
      { groupId: 1, code: 'A1' },
      { groupId: 2, code: 'B1' },
      { groupId: 3, code: 'C1' }
    ]

    const result = createGroupTransformer(groups, actions)

    expect(result).toEqual([
      { name: 'Group B', actions: ['B1'] },
      { name: 'Group A', actions: ['A1'] },
      { name: 'Group C', actions: ['C1'] }
    ])
  })

  test('should exclude groups with no actions', () => {
    const groups = [
      { id: 1, name: 'Group A' },
      { id: 2, name: 'Group B' }
    ]
    const actions = [{ groupId: 1, code: 'A1' }]

    const result = createGroupTransformer(groups, actions)

    expect(result).toEqual([{ name: 'Group A', actions: ['A1'] }])
  })

  test('should skip actions with unknown groupId', () => {
    const groups = [{ id: 1, name: 'Group A' }]
    const actions = [
      { groupId: 1, code: 'A1' },
      { groupId: 99, code: 'ORPHAN' }
    ]

    const result = createGroupTransformer(groups, actions)

    expect(result).toEqual([{ name: 'Group A', actions: ['A1'] }])
  })
})
