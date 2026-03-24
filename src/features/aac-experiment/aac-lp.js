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

  // Depth First Search to find connected components in compatibility graph
  function depthFirstSearch(action, currentGroup) {
    visited.add(action)
    currentGroup.push(action)

    for (const otherAction of actions) {
      if (
        !visited.has(otherAction) &&
        compatibilityCheckFn(action, otherAction)
      ) {
        depthFirstSearch(otherAction, currentGroup)
      }
    }
  }

  for (const action of actions) {
    if (!visited.has(action)) {
      const group = []
      depthFirstSearch(action, group)
      groups.push(group)
    }
  }

  return groups
}

/**
 * Creates initial LP model structure
 * @returns {object} Empty LP model
 */
function createLpModel() {
  return {
    optimize: 'objective',
    opType: 'max',
    constraints: {},
    variables: {}
  }
}

/**
 * Finds eligible land covers for an action
 * @param {string} action - Action code
 * @param {Record<string, Set<string>>} validLandCovers - Action to valid land covers mapping
 * @param {Record<string, number>} landCovers - Available land covers
 * @returns {string[]} Array of eligible cover names
 */
function findEligibleLandCovers(action, validLandCovers, landCovers) {
  const eligibleCovers = validLandCovers[action] ?? new Set()
  return [...eligibleCovers].filter((cover) => landCovers[cover] !== undefined)
}

/**
 * Creates LP variables for new action placement on eligible land covers
 * @param {object} model - LP model
 * @param {string} newAction - Action code
 * @param {Record<string, Set<string>>} validLandCovers - Action to valid land covers mapping
 * @param {Record<string, number>} landCovers - Map of cover name to area in sqm
 */
function createNewActionVariables(
  model,
  newAction,
  validLandCovers,
  landCovers
) {
  for (const [cover, capacity] of Object.entries(landCovers)) {
    if (!validLandCovers[newAction]?.has(cover)) continue

    const newActionVariable = `y__${cover}`
    if (!model.variables[newActionVariable])
      model.variables[newActionVariable] = {}
    model.variables[newActionVariable].objective = 1

    // Initial capacity constraint - will be updated based on incompatible actions
    addToConstraint(model, `capacity__${cover}`, newActionVariable, 1, {
      max: capacity
    })
  }
}

/**
 * Creates LP variables and constraints for existing action placement
 * @param {object} model - LP model
 * @param {Record<string, number>} existingActions - Map of action to committed area
 * @param {Record<string, Set<string>>} validLandCovers - Action to valid land covers mapping
 * @param {Record<string, number>} landCovers - Map of cover name to area in sqm
 */
function createExistingActionConstraints(
  model,
  existingActions,
  validLandCovers,
  landCovers
) {
  for (const [action, committedArea] of Object.entries(existingActions)) {
    const eligibleCovers = findEligibleLandCovers(
      action,
      validLandCovers,
      landCovers
    )

    for (const cover of eligibleCovers) {
      const actionVariable = `x__${action}__${cover}`

      // Physical constraint: action cannot exceed land cover capacity
      addToConstraint(
        model,
        `physical__${action}__${cover}`,
        actionVariable,
        1,
        {
          max: landCovers[cover]
        }
      )

      // Commitment constraint: action must place exactly its committed area
      addToConstraint(model, `commitment__${action}`, actionVariable, 1, {
        min: committedArea,
        max: committedArea
      })
    }
  }
}

/**
 * Finds actions that are eligible for a specific land cover
 * @param {string} landCover - Land cover name
 * @param {string[]} actionCodes - Array of action codes
 * @param {Record<string, Set<string>>} validLandCovers - Action to valid land covers mapping
 * @returns {string[]} Actions eligible for the land cover
 */
function findActionsEligibleForLandCover(
  landCover,
  actionCodes,
  validLandCovers
) {
  return actionCodes.filter((action) => {
    const eligible = validLandCovers[action] ?? new Set()
    return eligible.has(landCover)
  })
}

/**
 * Checks if a compatibility group contains any actions incompatible with target action
 * @param {string[]} group - Actions in the compatibility group
 * @param {string} targetAction - Action to check compatibility against
 * @param {function(string, string): boolean} compatibilityCheckFn - Compatibility function
 * @returns {boolean} True if group contains incompatible actions
 */
function groupHasIncompatibleActions(
  group,
  targetAction,
  compatibilityCheckFn
) {
  return group.some((action) => !compatibilityCheckFn(targetAction, action))
}

/**
 * Creates constraints for compatibility groups on a land cover (multi-group case)
 * @param {object} model - LP model
 * @param {string} landCover - Land cover name
 * @param {string[][]} compatibilityGroups - Array of compatibility groups
 * @param {number} landCoverCapacity - Total capacity of the land cover
 */
function createCompatibilityGroupConstraints(
  model,
  landCover,
  compatibilityGroups,
  landCoverCapacity
) {
  if (compatibilityGroups.length <= 1) return

  const groupSpaceConstraint = `group_space__${landCover}`

  for (
    let groupIndex = 0;
    groupIndex < compatibilityGroups.length;
    groupIndex++
  ) {
    const group = compatibilityGroups[groupIndex]
    const groupVariable = `group_${groupIndex}__${landCover}`

    // Group variable represents physical space used by this compatability stack
    if (!model.variables[groupVariable]) model.variables[groupVariable] = {}

    // Groups compete for physical space on the land cover
    addToConstraint(model, groupSpaceConstraint, groupVariable, 1, {
      max: landCoverCapacity
    })

    // Link group variable to individual actions: group space ≥ each stacked action
    for (const action of group) {
      const actionVariable = `x__${action}__${landCover}`
      const linkConstraint = `link_${groupVariable}__${action}`

      addToConstraint(model, linkConstraint, groupVariable, 1, { min: 0 })
      addToConstraint(model, linkConstraint, actionVariable, -1, { min: 0 })
    }
  }
}

/**
 * Adds group-level incompatibility constraint (multi-group case)
 * @param {object} model - LP model
 * @param {string} constraintName - Constraint name
 * @param {number} groupIndex - Index of the compatibility group
 * @param {string} landCover - Land cover name
 * @param {number} landCoverCapacity - Total capacity of the land cover
 */
function addGroupIncompatibilityConstraint(
  model,
  constraintName,
  groupIndex,
  landCover,
  landCoverCapacity
) {
  const groupVariable = `group_${groupIndex}__${landCover}`
  addToConstraint(model, constraintName, groupVariable, 1, {
    max: landCoverCapacity
  })
}

/**
 * Adds individual action incompatibility constraints (single-group case)
 * @param {object} model - LP model
 * @param {string} constraintName - Constraint name
 * @param {string[]} group - Actions in the compatibility group
 * @param {string} newAction - New action code
 * @param {string} landCover - Land cover name
 * @param {function(string, string): boolean} compatibilityCheckFn - Compatibility function
 * @param {number} landCoverCapacity - Total capacity of the land cover
 */
function addIndividualActionIncompatibilityConstraints(
  model,
  constraintName,
  group,
  newAction,
  landCover,
  compatibilityCheckFn,
  landCoverCapacity
) {
  for (const action of group) {
    if (!compatibilityCheckFn(newAction, action)) {
      const actionVariable = `x__${action}__${landCover}`
      addToConstraint(model, constraintName, actionVariable, 1, {
        max: landCoverCapacity
      })
    }
  }
}

/**
 * Adds incompatibility constraints for actions that cannot stack with new action
 * @param {object} model - LP model
 * @param {string} landCover - Land cover name
 * @param {string[][]} compatibilityGroups - Array of compatibility groups
 * @param {string} newAction - New action code
 * @param {function(string, string): boolean} compatibilityCheckFn - Compatibility function
 * @param {number} landCoverCapacity - Total capacity of the land cover
 */
function addIncompatibilityConstraints(
  model,
  landCover,
  compatibilityGroups,
  newAction,
  compatibilityCheckFn,
  landCoverCapacity
) {
  const incompatibilityConstraint = `capacity__${landCover}`
  const isMultiGroupScenario = compatibilityGroups.length > 1

  compatibilityGroups.forEach((group, groupIndex) => {
    const hasIncompatibleActions = groupHasIncompatibleActions(
      group,
      newAction,
      compatibilityCheckFn
    )

    if (hasIncompatibleActions) {
      if (isMultiGroupScenario) {
        // Multi-group case: use group variable (stacked space blocks new action)
        addGroupIncompatibilityConstraint(
          model,
          incompatibilityConstraint,
          groupIndex,
          landCover,
          landCoverCapacity
        )
      } else {
        // Single group case: use individual action variables
        addIndividualActionIncompatibilityConstraints(
          model,
          incompatibilityConstraint,
          group,
          newAction,
          landCover,
          compatibilityCheckFn,
          landCoverCapacity
        )
      }
    }
  })
}

/**
 * Builds all LP constraints for a specific land cover
 * @param {object} model - LP model
 * @param {string} landCover - Land cover name
 * @param {Record<string, number>} existingActions - Map of action to committed area
 * @param {string} newAction - New action code
 * @param {Record<string, Set<string>>} validLandCovers - Action to valid land covers mapping
 * @param {function(string, string): boolean} compatibilityCheckFn - Compatibility function
 * @param {number} landCoverCapacity - Total capacity of the land cover
 */
function buildLandCoverConstraints(
  model,
  landCover,
  existingActions,
  newAction,
  validLandCovers,
  compatibilityCheckFn,
  landCoverCapacity
) {
  const existingActionCodes = Object.keys(existingActions)
  const eligibleActions = findActionsEligibleForLandCover(
    landCover,
    existingActionCodes,
    validLandCovers
  )

  if (eligibleActions.length === 0) return

  // Find compatibility groups (stacks) among eligible actions
  const compatibilityGroups = findCompatibilityGroups(
    eligibleActions,
    compatibilityCheckFn
  )

  // Create constraints for multi-group scenarios where groups compete for space
  createCompatibilityGroupConstraints(
    model,
    landCover,
    compatibilityGroups,
    landCoverCapacity
  )

  // Add constraints for actions incompatible with new action
  if (validLandCovers[newAction]?.has(landCover)) {
    addIncompatibilityConstraints(
      model,
      landCover,
      compatibilityGroups,
      newAction,
      compatibilityCheckFn,
      landCoverCapacity
    )
  }
}

/**
 * Extracts new action allocation from LP solution
 * @param {object} lpResult - LP solver result
 * @param {Record<string, number>} landCovers - Available land covers
 * @returns {Record<string, number>} Map of land cover to allocated area
 */
function extractNewActionAllocation(lpResult, landCovers) {
  const allocation = /** @type {Record<string, number>} */ ({})
  for (const cover of Object.keys(landCovers)) {
    const value = lpResult[`y__${cover}`]
    if (value && value > 0) {
      allocation[cover] = value
    }
  }
  return allocation
}

/**
 * Extracts existing action placement from LP solution
 * @param {object} lpResult - LP solver result
 * @param {Record<string, number>} existingActions - Existing actions
 * @param {Record<string, number>} landCovers - Available land covers
 * @returns {Record<string, Record<string, number>>} Map of action to cover allocations
 */
function extractExistingActionPlacement(lpResult, existingActions, landCovers) {
  const placement = /** @type {Record<string, Record<string, number>>} */ ({})
  for (const action of Object.keys(existingActions)) {
    for (const cover of Object.keys(landCovers)) {
      const value = lpResult[`x__${action}__${cover}`]
      if (value && value > 0) {
        if (!placement[action]) placement[action] = {}
        placement[action][cover] = value
      }
    }
  }
  return placement
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
 * @param {Record<string, Set<string>>} params.validLandCovers - Map of action code to set of valid land cover names
 * @param {function(string, string): boolean} params.compatibilityCheckFn - Function that returns true if two actions are compatible
 * @returns {{ feasible: boolean, maxAreaSqm: number, newActionByCover: Record<string, number>, existingActionsByCover: Record<string, Record<string, number>> }}
 */
export function maxAreaForNewAction({
  covers,
  existingActions,
  newAction,
  validLandCovers,
  compatibilityCheckFn
}) {
  // Phase 1: Build LP model structure
  const model = createLpModel()

  // Phase 2: Create variables and basic constraints
  createNewActionVariables(model, newAction, validLandCovers, covers)
  createExistingActionConstraints(
    model,
    existingActions,
    validLandCovers,
    covers
  )

  // Phase 3: Build land cover specific constraints (compatibility groups and incompatibility)
  for (const [landCover, capacity] of Object.entries(covers)) {
    buildLandCoverConstraints(
      model,
      landCover,
      existingActions,
      newAction,
      validLandCovers,
      compatibilityCheckFn,
      capacity
    )
  }

  // Phase 4: Solve the linear program
  const lpResult = /** @type {any} */ (solver).Solve(model)

  if (!lpResult.feasible) {
    return {
      feasible: false,
      maxAreaSqm: 0,
      newActionByCover: {},
      existingActionsByCover: {}
    }
  }

  // Phase 5: Extract and return results
  return {
    feasible: true,
    maxAreaSqm: lpResult.result || 0,
    newActionByCover: extractNewActionAllocation(lpResult, covers),
    existingActionsByCover: extractExistingActionPlacement(
      lpResult,
      existingActions,
      covers
    )
  }
}
