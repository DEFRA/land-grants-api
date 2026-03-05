/**
 * @typedef {object} ActionGroup
 * @property {number} id - The group identifier
 * @property {string} name - The group name
 */

/**
 * @typedef {object} ActionWithGroupId
 * @property {number} groupId - The group identifier
 * @property {string} code - The action code
 */

/**
 * @typedef {object} TransformedActionGroup
 * @property {string} name - The group name
 * @property {string[]} actions - Array of action codes in the group
 */

/**
 * Transforms groups and actions into grouped format for the parcels endpoint.
 * @param {ActionGroup[]} actionGroups - Array of groups with id and name
 * @param {ActionWithGroupId[]} actions - Array of actions with groupId and code
 * @returns {TransformedActionGroup[]} Grouped format with name and actions array
 * @example
 * const actionGroups = [
 *   { id: 1, name: 'Assess moorland' },
 *   { id: 2, name: 'Livestock grazing on moorland' },
 * ]
 * const actions = [
 *   { groupId: 1, code: 'CMOR1' },
 *   { groupId: 2, code: 'UPL1' },
 *   { groupId: 2, code: 'UPL2' },
 *   { groupId: 2, code: 'UPL3' },
 * ]
 * actionGroupsTransformer(actionGroups, actions)
 * // => [
 * //   { name: 'Assess moorland', actions: ['CMOR1'] },
 * //   { name: 'Livestock grazing on moorland', actions: ['UPL1', 'UPL2', 'UPL3'] }
 * // ]
 */
export function actionGroupsTransformer(actionGroups, actions) {
  if (!actionGroups?.length || !actions?.length) {
    return []
  }

  const actionsByGroupId = actions.reduce((acc, { groupId, code }) => {
    if (!acc.has(groupId)) {
      acc.set(groupId, [])
    }
    acc.get(groupId).push(code)
    return acc
  }, new Map())

  return actionGroups
    .filter((actionGroup) => actionsByGroupId.has(actionGroup.id))
    .map((actionGroup) => {
      const groupActions = actionsByGroupId.get(actionGroup.id)
      return {
        name: actionGroup.name,
        actions: groupActions
      }
    })
}
