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
 * Calculates the maximum available area for a new action given existing action
 * commitments, using linear programming to find the optimal placement of those
 * existing actions across eligible land covers.
 *
 * Compatible existing actions are treated as "stackable" — they share physical
 * space with the new action and therefore do not reduce its available area.
 * Only actions in `incompatibleWith` compete with the new action for land.
 * @param {object} params
 * @param {Record<string, number>} params.covers - Map of land cover name to total area in sqm
 * @param {Record<string, number>} params.existingActions - Map of existing action code to area in sqm
 * @param {string} params.newAction - The action code of the new action to calculate area for
 * @param {Record<string, Set<string>>} params.eligibility - Map of action code to set of eligible cover names
 * @param {Set<string>} params.incompatibleWith - Set of existing action codes incompatible with the new action
 * @returns {{ feasible: boolean, maxAreaSqm: number, newActionByCover: Record<string, number>, existingPlaced: Record<string, Record<string, number>> }}
 */
export function maxAreaForNewAction({
  covers,
  existingActions,
  newAction,
  eligibility,
  incompatibleWith
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

      // Physical cap: all existing actions on this cover must not exceed its area
      addToConstraint(model, `xcap__${cover}`, xVar, 1, { max: covers[cover] })

      // Equality: each existing action must account for exactly its total area
      addToConstraint(model, `total__${action}`, xVar, 1, {
        min: total,
        max: total
      })

      // Incompatible actions compete directly with the new action on shared covers
      if (incompatibleWith.has(action) && model.constraints[`icap__${cover}`]) {
        addToConstraint(model, `icap__${cover}`, xVar, 1, {
          max: covers[cover]
        })
      }
    }
  }

  const result = solver.Solve(model)

  if (!result.feasible) {
    return { feasible: false, maxAreaSqm: 0 }
  }

  const newActionByCover = {}
  for (const cover of Object.keys(covers)) {
    const val = result[`y__${cover}`]
    if (val && val > 0) newActionByCover[cover] = val
  }

  const existingPlaced = {}
  for (const action of Object.keys(existingActions)) {
    for (const cover of Object.keys(covers)) {
      const val = result[`x__${action}__${cover}`]
      if (val && val > 0) {
        if (!existingPlaced[action]) existingPlaced[action] = {}
        existingPlaced[action][cover] = val
      }
    }
  }

  return {
    feasible: true,
    maxAreaSqm: result.result || 0,
    newActionByCover,
    existingPlaced
  }
}
