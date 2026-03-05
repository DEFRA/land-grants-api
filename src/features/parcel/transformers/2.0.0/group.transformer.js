/**
 * @typedef {object} Group
 * @property {number} id - The group identifier
 * @property {string} name - The group name
 */

/**
 * @typedef {object} ActionWithGroupId
 * @property {number} groupId - The group identifier
 * @property {string} code - The action code
 */

/**
 * @typedef {object} TransformedGroup
 * @property {string} name - The group name
 * @property {string[]} actions - Array of action codes in the group
 */

/**
 * Transforms groups and actions into grouped format for the parcels endpoint.
 * @param {Group[]} groups - Array of groups with id and name
 * @param {ActionWithGroupId[]} actions - Array of actions with groupId and code
 * @returns {TransformedGroup[]} Grouped format with name and actions array
 * @example
 * const groups = [
 *   { id: 1, name: 'Assess moorland' },
 *   { id: 2, name: 'Livestock grazing on moorland' },
 * ]
 * const actions = [
 *   { groupId: 1, code: 'CMOR1' },
 *   { groupId: 2, code: 'UPL1' },
 *   { groupId: 2, code: 'UPL2' },
 *   { groupId: 2, code: 'UPL3' },
 * ]
 * createGroupTransformer(groups, actions)
 * // => [
 * //   { name: 'Assess moorland', actions: ['CMOR1'] },
 * //   { name: 'Livestock grazing on moorland', actions: ['UPL1', 'UPL2', 'UPL3'] }
 * // ]
 */
function createGroupTransformer(groups, actions) {
  if (!groups?.length || !actions?.length) return []

  const actionsByGroupId = actions.reduce((acc, { groupId, code }) => {
    if (!acc.has(groupId)) acc.set(groupId, [])
    acc.get(groupId).push(code)
    return acc
  }, new Map())

  return groups
    .filter((g) => actionsByGroupId.has(g.id))
    .map(({ id, name }) => {
      const groupActions = actionsByGroupId.get(id)
      return {
        name,
        actions: groupActions
      }
    })
}

export { createGroupTransformer }
