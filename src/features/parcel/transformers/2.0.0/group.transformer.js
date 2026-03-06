/**
 * @typedef {import('~/src/features/actions/action.d.js').Action} Action
 */

/**
 * @typedef {object} TransformedActionGroup
 * @property {string} name - The group name
 * @property {string[]} actions - Array of action codes in the group
 */

/**
 * Transforms actions into grouped format for the parcels endpoint.
 * @param {Action[]} actions - Array of actions with groupId and code
 * @returns {TransformedActionGroup[]} Grouped format with name and actions array
 */
export function actionGroupsTransformer(actions) {
  if (!actions?.length) {
    return []
  }

  const actionGroups = [
    ...actions
      .filter((action) => action.groupId)
      .reduce((map, { groupId, groupName }) => {
        if (!map.has(groupId)) {
          map.set(groupId, { id: groupId, name: groupName })
        }
        return map
      }, new Map())
      .values()
  ]

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
