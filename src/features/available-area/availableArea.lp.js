/**
 * @import { CompatibilityCheckFn, ActionWithArea, AvailableAreaDataRequirements, AvailableAreaForActionLp } from './available-area.d.js'
 * @import { LandCoverCodes } from '~/src/features/land-cover-codes/land-cover-codes.d.js'
 * @import { LandCover } from '~/src/features/parcel/parcel.d.js'
 */

import _solver from 'javascript-lp-solver'
import { sqmToHaRounded } from '~/src/features/common/helpers/measurement.js'
import { mergeLandCoverCodes } from '~/src/features/land-cover-codes/services/merge-land-cover-codes.js'

/** @type {import('javascript-lp-solver').SolverAPI} */
const solver = /** @type {any} */ (_solver)

export const TARGET_SUFFIX = '__target'

/**
 * Finds the maximum available area for a new action on a parcel using
 * a linear programming approach to optimally arrange existing actions.
 * @param {string} applyingForAction - The action code being applied for
 * @param {ActionWithArea[]} existingActions - Existing actions and their areas on the parcel
 * @param {CompatibilityCheckFn} compatibilityCheckFn - Function returning true if two action codes can coexist
 * @param {AvailableAreaDataRequirements} dataRequirements - Pre-fetched land cover and eligibility data
 * @returns {AvailableAreaForActionLp}
 */
export function findMaximumAvailableArea(
  applyingForAction,
  existingActions,
  compatibilityCheckFn,
  dataRequirements
) {
  const {
    landCoverCodesForAppliedForAction,
    landCoversForParcel,
    landCoversForExistingActions
  } = dataRequirements

  const targetEligibleCodes = mergeLandCoverCodes(
    landCoverCodesForAppliedForAction
  )

  // Calculate total valid land cover area for the target action
  const totalValidLandCoverSqm = landCoversForParcel.reduce((sum, lc) => {
    if (targetEligibleCodes.includes(lc.landCoverClassCode)) {
      return sum + lc.areaSqm
    }
    return sum
  }, 0)

  // If no eligible land covers for the target, available area is 0
  if (totalValidLandCoverSqm === 0) {
    return {
      feasible: true,
      availableAreaHectares: 0,
      availableAreaSqm: 0,
      totalValidLandCoverSqm: 0,
      context: null
    }
  }

  // If no existing actions, available area = total valid land cover
  if (existingActions.length === 0) {
    const targetLabel = applyingForAction + TARGET_SUFFIX
    const eligibility = buildEligibilityMap(
      targetLabel,
      [],
      landCoverCodesForAppliedForAction,
      {},
      landCoversForParcel
    )
    return {
      feasible: true,
      availableAreaHectares: sqmToHaRounded(totalValidLandCoverSqm),
      availableAreaSqm: totalValidLandCoverSqm,
      totalValidLandCoverSqm,
      context: {
        solution: null,
        targetLabel,
        existingActions: [],
        landCoversForParcel,
        eligibility,
        cliques: [],
        compatibilityCheckFn
      }
    }
  }

  // Use a distinct label for the target action so it doesn't collide with
  // an existing action that has the same code
  const targetLabel = applyingForAction + TARGET_SUFFIX

  // Build eligibility map: actionCode -> set of parcel land cover class codes it can use
  const eligibility = buildEligibilityMap(
    targetLabel,
    existingActions,
    landCoverCodesForAppliedForAction,
    landCoversForExistingActions,
    landCoversForParcel
  )

  // All action codes involved (existing + target)
  const allActionCodes = [
    targetLabel,
    ...existingActions.map((a) => a.actionCode)
  ]

  // Find all maximal cliques in the incompatibility graph
  // Wrap the compatibility check to map the target label back to the real code
  const wrappedCompatibilityCheck = (a, b) => {
    const realA = a.endsWith(TARGET_SUFFIX)
      ? a.slice(0, -TARGET_SUFFIX.length)
      : a
    const realB = b.endsWith(TARGET_SUFFIX)
      ? b.slice(0, -TARGET_SUFFIX.length)
      : b
    return compatibilityCheckFn(realA, realB)
  }
  const cliques = findMaximalCliques(allActionCodes, wrappedCompatibilityCheck)

  // Build and solve the LP model
  const model = buildLpModel(
    targetLabel,
    existingActions,
    landCoversForParcel,
    eligibility,
    cliques
  )

  const result = /** @type {import('javascript-lp-solver').SolveResult} */ (
    solver.Solve(model)
  )

  const context = {
    solution: result.feasible ? result : null,
    targetLabel,
    existingActions,
    landCoversForParcel,
    eligibility,
    cliques,
    compatibilityCheckFn
  }

  if (!result.feasible) {
    return {
      feasible: false,
      availableAreaHectares: 0,
      availableAreaSqm: 0,
      totalValidLandCoverSqm,
      context
    }
  }

  const availableAreaSqm = Math.max(0, result.result ?? 0)

  return {
    feasible: true,
    availableAreaHectares: sqmToHaRounded(availableAreaSqm),
    availableAreaSqm,
    totalValidLandCoverSqm,
    context
  }
}

/**
 * Builds a map of actionCode -> array of parcel land cover indices the action is eligible for.
 * Handles unreliable land cover data by checking both landCoverCode and landCoverClassCode.
 * @param {string} targetLabel
 * @param {ActionWithArea[]} existingActions
 * @param {LandCoverCodes[]} landCoverCodesForAppliedForAction
 * @param {{[key: string]: LandCoverCodes[]}} landCoversForExistingActions
 * @param {LandCover[]} landCoversForParcel
 * @returns {Map<string, number[]>} actionCode -> array of land cover indices
 */
function buildEligibilityMap(
  targetLabel,
  existingActions,
  landCoverCodesForAppliedForAction,
  landCoversForExistingActions,
  landCoversForParcel
) {
  const eligibility = new Map()

  // Build for target action (stored under the target label to avoid collisions)
  const targetMerged = mergeLandCoverCodes(landCoverCodesForAppliedForAction)
  eligibility.set(
    targetLabel,
    getEligibleLandCoverIndices(targetMerged, landCoversForParcel)
  )

  // Build for each existing action
  for (const action of existingActions) {
    const actionLandCoverCodes = landCoversForExistingActions[action.actionCode]
    if (actionLandCoverCodes) {
      const merged = mergeLandCoverCodes(actionLandCoverCodes)
      eligibility.set(
        action.actionCode,
        getEligibleLandCoverIndices(merged, landCoversForParcel)
      )
    } else {
      eligibility.set(action.actionCode, [])
    }
  }

  return eligibility
}

/**
 * Returns indices of parcel land covers that an action is eligible for.
 * @param {string[]} mergedCodes - merged land cover codes for an action
 * @param {LandCover[]} landCoversForParcel
 * @returns {number[]}
 */
function getEligibleLandCoverIndices(mergedCodes, landCoversForParcel) {
  const indices = []
  for (let i = 0; i < landCoversForParcel.length; i++) {
    if (mergedCodes.includes(landCoversForParcel[i].landCoverClassCode)) {
      indices.push(i)
    }
  }
  return indices
}

/**
 * Finds all maximal cliques in the incompatibility graph using Bron-Kerbosch.
 * A clique here is a set of actions that are all mutually incompatible.
 * @param {string[]} actionCodes
 * @param {CompatibilityCheckFn} compatibilityCheckFn
 * @returns {string[][]} Array of cliques, each clique is an array of action codes
 */
function findMaximalCliques(actionCodes, compatibilityCheckFn) {
  // Build adjacency list for the incompatibility graph
  const neighbors = new Map()
  for (const code of actionCodes) {
    neighbors.set(code, new Set())
  }

  for (let i = 0; i < actionCodes.length; i++) {
    for (let j = i + 1; j < actionCodes.length; j++) {
      const a = actionCodes[i]
      const b = actionCodes[j]
      if (!compatibilityCheckFn(a, b)) {
        neighbors.get(a).add(b)
        neighbors.get(b).add(a)
      }
    }
  }

  const cliques = []

  // Bron-Kerbosch with pivot
  function bronKerbosch(R, P, X) {
    if (P.size === 0 && X.size === 0) {
      if (R.size >= 2) {
        cliques.push([...R])
      }
      return
    }

    // Choose pivot as the vertex in P union X with the most neighbors in P
    const union = new Set([...P, ...X])
    let pivot = null
    let maxNeighborsInP = -1
    for (const u of union) {
      const count = [...P].filter((v) => neighbors.get(u).has(v)).length
      if (count > maxNeighborsInP) {
        maxNeighborsInP = count
        pivot = u
      }
    }

    const candidates = [...P].filter(
      (v) => !pivot || !neighbors.get(pivot).has(v)
    )

    for (const v of candidates) {
      const vNeighbors = neighbors.get(v)
      bronKerbosch(
        new Set([...R, v]),
        new Set([...P].filter((u) => vNeighbors.has(u))),
        new Set([...X].filter((u) => vNeighbors.has(u)))
      )
      P.delete(v)
      X.add(v)
    }
  }

  bronKerbosch(new Set(), new Set(actionCodes), new Set())

  // Also add individual actions as singleton "cliques" for capacity constraints
  // (each action alone can't exceed land cover area)
  for (const code of actionCodes) {
    cliques.push([code])
  }

  return cliques
}

/**
 * Builds demand constraints: each existing action's area must be fully placed.
 * @param {ActionWithArea[]} existingActions
 * @returns {{[key: string]: {equal: number}}}
 */
function buildDemandConstraints(existingActions) {
  return Object.fromEntries(
    existingActions.map((a) => [`demand_${a.actionCode}`, { equal: a.areaSqm }])
  )
}

/**
 * Builds variables for each (existing action, eligible land cover) pair.
 * @param {ActionWithArea[]} existingActions
 * @param {Map<string, number[]>} eligibility
 * @returns {{[key: string]: object}}
 */
function buildExistingActionVariables(existingActions, eligibility) {
  return Object.fromEntries(
    existingActions.flatMap((action) =>
      (eligibility.get(action.actionCode) ?? []).map((lcIdx) => [
        `x_${action.actionCode}_${lcIdx}`,
        { [`demand_${action.actionCode}`]: 1 }
      ])
    )
  )
}

/**
 * Builds target variables for each eligible land cover.
 * @param {string} targetAction
 * @param {Map<string, number[]>} eligibility
 * @returns {{[key: string]: object}}
 */
function buildTargetVariables(targetAction, eligibility) {
  return Object.fromEntries(
    (eligibility.get(targetAction) ?? []).map((lcIdx) => [
      `t_${lcIdx}`,
      { availableArea: 1 }
    ])
  )
}

/**
 * Builds clique capacity constraints and adds coefficients to variables.
 * For each clique and each land cover, the sum of allocations for clique
 * members eligible for that land cover must not exceed the land cover's area.
 * @param {string} targetAction
 * @param {LandCover[]} landCoversForParcel
 * @param {Map<string, number[]>} eligibility
 * @param {string[][]} cliques
 * @param {{[key: string]: object}} variables - mutated to add constraint coefficients
 * @returns {{[key: string]: {max: number}}}
 */
function buildCliqueCapacityConstraints(
  targetAction,
  landCoversForParcel,
  eligibility,
  cliques,
  variables
) {
  /** @type {{[key: string]: {max: number}}} */
  const constraints = {}

  const getVarName = (code, lcIdx) =>
    code === targetAction ? `t_${lcIdx}` : `x_${code}_${lcIdx}`

  const getEligibleMembers = (clique, lcIdx) =>
    clique.filter((code) => (eligibility.get(code) ?? []).includes(lcIdx))

  cliques.forEach((clique, cliqueIdx) => {
    for (let lcIdx = 0; lcIdx < landCoversForParcel.length; lcIdx++) {
      const membersOnLc = getEligibleMembers(clique, lcIdx)
      if (membersOnLc.length === 0) continue

      const constraintKey = `clique_${cliqueIdx}_lc_${lcIdx}`
      constraints[constraintKey] = { max: landCoversForParcel[lcIdx].areaSqm }

      for (const code of membersOnLc) {
        const varName = getVarName(code, lcIdx)
        if (variables[varName]) {
          variables[varName][constraintKey] = 1
        }
      }
    }
  })

  return constraints
}

/**
 * Builds the LP model for javascript-lp-solver.
 * @param {string} targetAction
 * @param {ActionWithArea[]} existingActions
 * @param {LandCover[]} landCoversForParcel
 * @param {Map<string, number[]>} eligibility
 * @param {string[][]} cliques
 * @returns {object} LP model
 */
function buildLpModel(
  targetAction,
  existingActions,
  landCoversForParcel,
  eligibility,
  cliques
) {
  const variables = {
    ...buildExistingActionVariables(existingActions, eligibility),
    ...buildTargetVariables(targetAction, eligibility)
  }

  const constraints = {
    ...buildDemandConstraints(existingActions),
    ...buildCliqueCapacityConstraints(
      targetAction,
      landCoversForParcel,
      eligibility,
      cliques,
      variables
    )
  }

  return {
    optimize: 'availableArea',
    opType: 'max',
    constraints,
    variables
  }
}
