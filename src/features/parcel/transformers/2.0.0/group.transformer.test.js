import { actionGroupsTransformer } from './group.transformer.js'

describe('actionGroupsTransformer', () => {
  test('should transform actions into grouped format', () => {
    const actions = [
      { groupId: 1, groupName: 'Assess moorland', code: 'CMOR1' },
      { groupId: 2, groupName: 'Livestock grazing on moorland', code: 'UPL1' },
      { groupId: 2, groupName: 'Livestock grazing on moorland', code: 'UPL2' },
      { groupId: 2, groupName: 'Livestock grazing on moorland', code: 'UPL3' }
    ]

    const result = actionGroupsTransformer(actions)

    expect(result).toEqual([
      { name: 'Assess moorland', actions: ['CMOR1'] },
      {
        name: 'Livestock grazing on moorland',
        actions: ['UPL1', 'UPL2', 'UPL3']
      }
    ])
  })

  test('should return single action group', () => {
    const actions = [
      { groupId: 1, groupName: 'Assess moorland', code: 'CMOR1' }
    ]

    const result = actionGroupsTransformer(actions)

    expect(result).toEqual([{ name: 'Assess moorland', actions: ['CMOR1'] }])
  })

  test('should return multi-action group', () => {
    const actions = [
      { groupId: 1, groupName: 'Livestock grazing on moorland', code: 'UPL1' },
      { groupId: 1, groupName: 'Livestock grazing on moorland', code: 'UPL2' }
    ]

    const result = actionGroupsTransformer(actions)

    expect(result).toEqual([
      {
        name: 'Livestock grazing on moorland',
        actions: ['UPL1', 'UPL2']
      }
    ])
  })

  test('should deduplicate groups derived from repeated groupIds', () => {
    const actions = [
      { groupId: 1, groupName: 'Group A', code: 'A1' },
      { groupId: 1, groupName: 'Group A', code: 'A2' },
      { groupId: 1, groupName: 'Group A', code: 'A3' }
    ]

    const result = actionGroupsTransformer(actions)

    expect(result).toEqual([{ name: 'Group A', actions: ['A1', 'A2', 'A3'] }])
  })

  test('should preserve group order based on first appearance in actions', () => {
    const actions = [
      { groupId: 2, groupName: 'Group B', code: 'B1' },
      { groupId: 1, groupName: 'Group A', code: 'A1' },
      { groupId: 3, groupName: 'Group C', code: 'C1' }
    ]

    const result = actionGroupsTransformer(actions)

    expect(result).toEqual([
      { name: 'Group B', actions: ['B1'] },
      { name: 'Group A', actions: ['A1'] },
      { name: 'Group C', actions: ['C1'] }
    ])
  })

  test('should exclude actions without a groupId', () => {
    const actions = [
      { groupId: 1, groupName: 'Group A', code: 'A1' },
      { code: 'ORPHAN' }
    ]

    const result = actionGroupsTransformer(actions)

    expect(result).toEqual([{ name: 'Group A', actions: ['A1'] }])
  })

  test('should return empty array when actions is null', () => {
    expect(actionGroupsTransformer(null)).toEqual([])
  })

  test('should return empty array when actions is undefined', () => {
    expect(actionGroupsTransformer(undefined)).toEqual([])
  })

  test('should return empty array when actions is empty array', () => {
    expect(actionGroupsTransformer([])).toEqual([])
  })
})
