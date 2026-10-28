/**
 * @param {string} actionCode - The action code to check against
 * @param {Occupancy[]} occupancies - The boundary each existing action occupies
 * @param {CompatibilityCheckFn} compatibilityCheckFn - Whether two actions can share a stretch of boundary
 * @returns {Occupancy[]} The occupancies of actions that cannot share a stretch with the one given
 */
export function incompatibleWith(
  actionCode,
  occupancies,
  compatibilityCheckFn
) {
  return occupancies.filter((occupancy) => {
    const compatible = compatibilityCheckFn(occupancy.actionCode, actionCode)

    return !compatible
  })
}

/**
 * The minimum boundary the actions fit into, stacking any that can share a
 * stretch. Of two arrangements needing the same, the one whose first action
 * comes earliest is chosen.
 * @param {Occupancy[]} actions - The actions, each with the boundary it occupies
 * @param {CompatibilityCheckFn} compatibilityCheckFn - Whether two actions can share a stretch of boundary
 * @returns {{actions: Occupancy[], meters: number}} The actions laid end to end, in the order given, and the boundary they need
 */
export function findMinimumBoundary(actions, compatibilityCheckFn) {
  let minimumBoundary = { actions: [], meters: 0 }

  // Records the group if it is the longest yet, then tries each candidate as one more member
  const extendGroup = (group, groupMeters, candidates) => {
    if (groupMeters > minimumBoundary.meters) {
      minimumBoundary = { actions: group, meters: groupMeters }
    }

    candidates.forEach((candidate, index) => {
      const nextCandidates = incompatibleWith(
        candidate.actionCode,
        candidates.slice(index + 1),
        compatibilityCheckFn
      )

      extendGroup(
        [...group, candidate],
        groupMeters + candidate.occupiedMeters,
        nextCandidates
      )
    })
  }

  extendGroup([], 0, actions)

  return minimumBoundary
}

/**
 * @import { CompatibilityCheckFn } from '~/src/features/available-area/available-area.d.js'
 * @import { Occupancy } from '~/src/features/available-length/available-length.d.js'
 */
