import solver from 'javascript-lp-solver'

/**
 * Adds a variable's coefficient to a named LP constraint, initialising both
 * the constraint and the variable entry if they do not yet exist.
 * @param {object} model - The LP model object
 * @param {string} name - Constraint name
 * @param {string} varName - LP variable name
 * @param {number} coeff - Coefficient to assign
 * @param {{ min?: number, max?: number }} def - Constraint bounds (only applied on first creation)
 */
function addToConstraint(model, name, varName, coeff, def) {
  if (!model.constraints[name]) model.constraints[name] = def
  if (!model.variables[varName]) model.variables[varName] = {}
  model.variables[varName][name] = (model.variables[varName][name] || 0) + coeff
}

/**
 * Finds compatibility groups (connected components) among actions.
 * Actions in the same group can stack (share physical space).
 * @param {string[]} actions - Array of action codes
 * @param {Function} compatibilityCheckFn - Function to check if two actions are compatible
 * @returns {string[][]} Array of compatibility groups
 */
function findCompatibilityGroups(actions, compatibilityCheckFn) {
  const visited = new Set()
  const groups = []

  // DFS to find connected components in compatibility graph
  function dfs(action, currentGroup) {
    visited.add(action)
    currentGroup.push(action)

    for (const otherAction of actions) {
      if (
        !visited.has(otherAction) &&
        compatibilityCheckFn(action, otherAction)
      ) {
        dfs(otherAction, currentGroup)
      }
    }
  }

  for (const action of actions) {
    if (!visited.has(action)) {
      const group = []
      dfs(action, group)
      groups.push(group)
    }
  }

  return groups
}

/**
 * Calculates the maximum available area for a new action given existing action
 * commitments, using linear programming to find the optimal placement of those
 * existing actions across eligible land covers.
 *
 * Compatible existing actions are treated as "stackable" — they share physical
 * space with each other and with the new action and therefore do not reduce
 * available area. Only incompatible action combinations compete for land.
 * @param {object} params
 * @param {Record<string, number>} params.covers - Map of land cover name to total area in sqm
 * @param {Record<string, number>} params.existingActions - Map of existing action code to area in sqm
 * @param {string} params.newAction - The action code of the new action to calculate area for
 * @param {Record<string, Set<string>>} params.eligibility - Map of action code to set of eligible cover names
 * @param {function(string, string): boolean} params.compatibilityCheckFn - Function that returns true if two actions are compatible
 * @returns {{ feasible: boolean, maxAreaSqm: number, newActionByCover: Record<string, number>, existingActionsByCover: Record<string, Record<string, number>> }}
 */
export function maxAreaForNewAction({
  covers,
  existingActions,
  newAction,
  eligibility,
  compatibilityCheckFn
}) {
  const model = {
    optimize: 'objective',
    opType: 'max',
    constraints: {},
    variables: {}
  }

  // y[c]: sqm of new action placed on cover c
  for (const [cover, cap] of Object.entries(covers)) {
    if (!eligibility[newAction]?.has(cover)) continue

    const yVar = `y__${cover}`
    if (!model.variables[yVar]) model.variables[yVar] = {}
    model.variables[yVar].objective = 1

    // y[c] is only constrained by incompatible existing actions on this cover.
    // Compatible existing actions can stack with the new action and do not reduce its area.
    addToConstraint(model, `icap__${cover}`, yVar, 1, { max: cap })
  }

  // x[a,c]: sqm of existing action a placed on cover c
  for (const [action, total] of Object.entries(existingActions)) {
    const eligible = [...(eligibility[action] ?? [])].filter(
      (c) => covers[c] !== undefined
    )

    for (const cover of eligible) {
      const xVar = `x__${action}__${cover}`

      // Basic physical constraint: no action can exceed the cover's total area
      addToConstraint(model, `pcap__${action}__${cover}`, xVar, 1, {
        max: covers[cover]
      })

      // Equality: each existing action must account for exactly its total area
      addToConstraint(model, `total__${action}`, xVar, 1, {
        min: total,
        max: total
      })

      // Note: Incompatibility constraint is handled separately after groups are formed
    }
  }

  // Add constraints for incompatible compatibility groups by cover
  // This properly models stacking: compatible actions share physical space,
  // incompatible groups compete for physical space
  const existingActionCodes = Object.keys(existingActions)

  for (const cover of Object.keys(covers)) {
    // Find all actions eligible for this cover
    const actionsEligibleForCover = existingActionCodes.filter((action) => {
      const eligible = eligibility[action] ?? new Set()
      return eligible.has(cover)
    })

    if (actionsEligibleForCover.length > 1) {
      // Build compatibility groups (connected components)
      const compatibilityGroups = findCompatibilityGroups(
        actionsEligibleForCover,
        compatibilityCheckFn
      )

      // If we have multiple groups, they compete for physical space
      if (compatibilityGroups.length > 1) {
        const constraintName = `group_space__${cover}`

        for (
          let groupIndex = 0;
          groupIndex < compatibilityGroups.length;
          groupIndex++
        ) {
          const group = compatibilityGroups[groupIndex]
          const groupVar = `group_${groupIndex}__${cover}`

          // Group variable represents physical space used by this compatibility group
          if (!model.variables[groupVar]) model.variables[groupVar] = {}

          // Add group space variable to the inter-group constraint
          addToConstraint(model, constraintName, groupVar, 1, {
            max: covers[cover]
          })

          // Link group variable to individual action variables:
          // group_space >= each action in the group (since they stack)
          for (const action of group) {
            const xVar = `x__${action}__${cover}`
            const linkConstraintName = `link_${groupVar}__${action}`

            // group_var >= x__action__cover (group space ≥ any individual action)
            addToConstraint(model, linkConstraintName, groupVar, 1, {
              min: 0
            })
            addToConstraint(model, linkConstraintName, xVar, -1, { min: 0 })
          }
        }
      }
    }
  }

  // Add incompatibility constraints correctly considering groups
  // Actions incompatible with the new action should contribute their group space, not individual areas

  for (const cover of Object.keys(covers)) {
    if (!eligibility[newAction]?.has(cover)) continue

    // Find all actions eligible for this cover
    const actionsEligibleForCover = existingActionCodes.filter((action) => {
      const eligible = eligibility[action] ?? new Set()
      return eligible.has(cover)
    })

    if (actionsEligibleForCover.length > 0) {
      // Build compatibility groups
      const compatibilityGroups = findCompatibilityGroups(
        actionsEligibleForCover,
        compatibilityCheckFn
      )

      // For the incompatibility constraint, add group contributions
      const incompatibilityConstraint = `icap__${cover}`

      for (
        let groupIndex = 0;
        groupIndex < compatibilityGroups.length;
        groupIndex++
      ) {
        const group = compatibilityGroups[groupIndex]
        const hasIncompatibleInGroup = group.some(
          (action) => !compatibilityCheckFn(newAction, action)
        )

        if (hasIncompatibleInGroup) {
          if (compatibilityGroups.length > 1) {
            // Multi-group case: use group variable
            const groupVar = `group_${groupIndex}__${cover}`
            addToConstraint(model, incompatibilityConstraint, groupVar, 1, {
              max: covers[cover]
            })
          } else {
            // Single group case: use individual action variables
            for (const action of group) {
              if (!compatibilityCheckFn(newAction, action)) {
                const xVar = `x__${action}__${cover}`
                addToConstraint(model, incompatibilityConstraint, xVar, 1, {
                  max: covers[cover]
                })
              }
            }
          }
        }
      }
    }
  }

  const result = /** @type {any} */ (solver).Solve(model)
  // console.log('--model--', JSON.stringify(model, null, 2))
  // console.log('--result--', JSON.stringify(result, null, 2))
  if (!result.feasible) {
    return {
      feasible: false,
      maxAreaSqm: 0,
      newActionByCover: {},
      existingActionsByCover: {}
    }
  }

  const newActionByCover = /** @type {Record<string, number>} */ ({})
  for (const cover of Object.keys(covers)) {
    const val = result[`y__${cover}`]
    if (val && val > 0) newActionByCover[cover] = val
  }

  const existingActionsByCover =
    /** @type {Record<string, Record<string, number>>} */ ({})
  for (const action of Object.keys(existingActions)) {
    for (const cover of Object.keys(covers)) {
      const val = result[`x__${action}__${cover}`]
      if (val && val > 0) {
        if (!existingActionsByCover[action]) existingActionsByCover[action] = {}
        existingActionsByCover[action][cover] = val
      }
    }
  }

  return {
    feasible: true,
    maxAreaSqm: result.result || 0,
    newActionByCover,
    existingActionsByCover
  }
}
