/**
 * @import { CompatibilityCheckFn, ActionWithArea, AvailableAreaDataRequirements, AvailableAreaForAction } from './available-area.d.js'
 * @import { LandCoverCodes } from '~/src/features/land-cover-codes/land-cover-codes.d.js'
 * @import { LandCover } from '~/src/features/parcel/parcel.d.js'
 */

import solver from 'javascript-lp-solver'
import { sqmToHaRounded } from '~/src/features/common/helpers/measurement.js'
import { mergeLandCoverCodes } from '~/src/features/land-cover-codes/services/merge-land-cover-codes.js'

const TARGET_SUFFIX = '__target'

/**
 * Finds the maximum available area for a new action on a parcel using
 * a linear programming approach to optimally arrange existing actions.
 *
 * @param {string} applyingForAction - The action code being applied for
 * @param {ActionWithArea[]} existingActions - Existing actions and their areas on the parcel
 * @param {CompatibilityCheckFn} compatibilityCheckFn - Function returning true if two action codes can coexist
 * @param {AvailableAreaDataRequirements} dataRequirements - Pre-fetched land cover and eligibility data
 * @returns {AvailableAreaForAction}
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

  const emptyExplanations = {
    eligibility: {},
    adjustedActions: [],
    incompatibilityCliques: [],
    allocations: [],
    targetAvailability: [],
    stacks: []
  }

  // If no eligible land covers for the target, available area is 0
  if (totalValidLandCoverSqm === 0) {
    return {
      availableAreaHectares: 0,
      availableAreaSqm: 0,
      totalValidLandCoverSqm: 0,
      explanations: emptyExplanations
    }
  }

  // If no existing actions, available area = total valid land cover
  if (existingActions.length === 0) {
    const targetIndices = getEligibleLandCoverIndices(
      targetEligibleCodes,
      landCoversForParcel
    )
    return {
      availableAreaHectares: sqmToHaRounded(totalValidLandCoverSqm),
      availableAreaSqm: totalValidLandCoverSqm,
      totalValidLandCoverSqm,
      explanations: {
        ...emptyExplanations,
        eligibility: {
          [applyingForAction]: targetIndices.map((lcIdx) => ({
            landCoverIndex: lcIdx,
            landCoverClassCode: landCoversForParcel[lcIdx].landCoverClassCode,
            areaSqm: landCoversForParcel[lcIdx].areaSqm
          }))
        },
        targetAvailability: targetIndices.map((lcIdx) => ({
          landCoverIndex: lcIdx,
          totalAreaSqm: landCoversForParcel[lcIdx].areaSqm,
          usedByExistingSqm: 0,
          availableSqm: landCoversForParcel[lcIdx].areaSqm
        }))
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

  // Filter existing actions: exclude those with no eligible land covers on the parcel
  // and cap demand at total eligible area (handles data inconsistencies)
  const lpActions = existingActions
    .filter((a) => (eligibility.get(a.actionCode) ?? []).length > 0)
    .map((a) => {
      const eligibleIndices = eligibility.get(a.actionCode) ?? []
      const totalEligibleArea = eligibleIndices.reduce(
        (sum, idx) => sum + landCoversForParcel[idx].areaSqm,
        0
      )
      return {
        actionCode: a.actionCode,
        areaSqm: Math.min(a.areaSqm, totalEligibleArea)
      }
    })

  // All action codes involved (eligible existing + target)
  const allActionCodes = [
    targetLabel,
    ...lpActions.map((a) => a.actionCode)
  ]

  // Find all maximal cliques in the incompatibility graph
  // Wrap the compatibility check to map the target label back to the real code
  const wrappedCompatibilityCheck = (a, b) => {
    const realA = a.endsWith(TARGET_SUFFIX) ? a.slice(0, -TARGET_SUFFIX.length) : a
    const realB = b.endsWith(TARGET_SUFFIX) ? b.slice(0, -TARGET_SUFFIX.length) : b
    return compatibilityCheckFn(realA, realB)
  }
  const cliques = findMaximalCliques(allActionCodes, wrappedCompatibilityCheck)

  // Build and solve the LP model
  const model = buildLpModel(
    targetLabel,
    lpActions,
    landCoversForParcel,
    eligibility,
    cliques
  )

  const result = solver.Solve(model)

  if (!result.feasible) {
    return {
      availableAreaHectares: 0,
      availableAreaSqm: 0,
      totalValidLandCoverSqm,
      explanations: emptyExplanations
    }
  }

  const availableAreaSqm = Math.max(0, result.result ?? 0)

  return {
    availableAreaHectares: sqmToHaRounded(availableAreaSqm),
    availableAreaSqm,
    totalValidLandCoverSqm,
    explanations: buildExplanations(
      result,
      targetLabel,
      existingActions,
      lpActions,
      landCoversForParcel,
      eligibility,
      cliques,
      compatibilityCheckFn
    )
  }
}

/**
 * Builds a map of actionCode -> array of parcel land cover indices the action is eligible for.
 * Handles unreliable land cover data by checking both landCoverCode and landCoverClassCode.
 *
 * @param {string} applyingForAction
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
 *
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
 * Builds the LP model for javascript-lp-solver.
 *
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
  const constraints = {}
  const variables = {}

  // 1. Demand constraints: each existing action's area must be fully placed
  for (const action of existingActions) {
    const demandKey = `demand_${action.actionCode}`
    constraints[demandKey] = { equal: action.areaSqm }
  }

  // 2. Create variables for each (existing action, eligible land cover) pair
  for (const action of existingActions) {
    const eligibleIndices = eligibility.get(action.actionCode) ?? []
    for (const lcIdx of eligibleIndices) {
      const varName = `x_${action.actionCode}_${lcIdx}`
      variables[varName] = {
        [`demand_${action.actionCode}`]: 1
      }
    }
  }

  // 3. Create target variables for each eligible land cover
  const targetIndices = eligibility.get(targetAction) ?? []
  for (const lcIdx of targetIndices) {
    const varName = `t_${lcIdx}`
    variables[varName] = {
      availableArea: 1
    }
  }

  // 4. Clique capacity constraints: for each clique and each land cover,
  //    the sum of allocations for clique members eligible for that land cover <= area
  let cliqueIdx = 0
  for (const clique of cliques) {
    for (let lcIdx = 0; lcIdx < landCoversForParcel.length; lcIdx++) {
      // Check which clique members are eligible for this land cover
      const membersOnLc = clique.filter((code) => {
        const eligible = eligibility.get(code) ?? []
        return eligible.includes(lcIdx)
      })

      if (membersOnLc.length === 0) continue

      const constraintKey = `clique_${cliqueIdx}_lc_${lcIdx}`
      constraints[constraintKey] = { max: landCoversForParcel[lcIdx].areaSqm }

      for (const code of membersOnLc) {
        const varName =
          code === targetAction ? `t_${lcIdx}` : `x_${code}_${lcIdx}`
        if (variables[varName]) {
          variables[varName][constraintKey] = 1
        }
      }
    }
    cliqueIdx++
  }

  return {
    optimize: 'availableArea',
    opType: 'max',
    constraints,
    variables
  }
}

/**
 * Builds structured explanations from the LP solution to help users
 * understand why the available area is what it is.
 *
 * @param {object} solution - LP solver result
 * @param {string} targetAction
 * @param {ActionWithArea[]} existingActions - Original existing actions (before filtering/capping)
 * @param {ActionWithArea[]} lpActions - Filtered/capped actions used in the LP
 * @param {LandCover[]} landCoversForParcel
 * @param {Map<string, number[]>} eligibility
 * @param {string[][]} cliques
 * @param {CompatibilityCheckFn} compatibilityCheckFn
 * @returns {import('./available-area.d.js').AacExplanations}
 */
function buildExplanations(
  solution,
  targetAction,
  existingActions,
  lpActions,
  landCoversForParcel,
  eligibility,
  cliques,
  compatibilityCheckFn
) {
  // Eligibility: which land covers each action can use
  // Map the target label back to the real action code for user-facing output
  const eligibilityExplanation = {}
  for (const [actionCode, indices] of eligibility) {
    const displayCode = actionCode.endsWith(TARGET_SUFFIX)
      ? actionCode.slice(0, -TARGET_SUFFIX.length)
      : actionCode
    eligibilityExplanation[displayCode] = indices.map((lcIdx) => ({
      landCoverIndex: lcIdx,
      landCoverClassCode: landCoversForParcel[lcIdx].landCoverClassCode,
      areaSqm: landCoversForParcel[lcIdx].areaSqm
    }))
  }

  // Adjusted actions: compare original vs LP-filtered/capped
  const lpActionMap = new Map(lpActions.map((a) => [a.actionCode, a]))
  const adjustedActions = existingActions.map((a) => {
    const lpAction = lpActionMap.get(a.actionCode)
    return {
      actionCode: a.actionCode,
      originalAreaSqm: a.areaSqm,
      adjustedAreaSqm: lpAction?.areaSqm ?? 0,
      wasCapped: lpAction ? lpAction.areaSqm < a.areaSqm : false,
      wasExcluded: !lpAction
    }
  })

  // Incompatibility cliques (only those with 2+ members)
  // Strip target suffix from clique members for display
  const incompatibilityCliques = cliques
    .filter((c) => c.length >= 2)
    .map((c) =>
      c.map((code) =>
        code.endsWith(TARGET_SUFFIX)
          ? code.slice(0, -TARGET_SUFFIX.length)
          : code
      )
    )

  // Allocations: how the LP placed each existing action across land covers
  const allocations = []
  for (const action of lpActions) {
    const eligibleIndices = eligibility.get(action.actionCode) ?? []
    for (const lcIdx of eligibleIndices) {
      const varName = `x_${action.actionCode}_${lcIdx}`
      const value = solution[varName] || 0
      if (value > 0.001) {
        allocations.push({
          actionCode: action.actionCode,
          landCoverIndex: lcIdx,
          areaSqm: value
        })
      }
    }
  }

  // Target availability: per-land-cover breakdown
  const targetIndices = eligibility.get(targetAction) ?? []
  const targetAvailability = targetIndices.map((lcIdx) => {
    const varName = `t_${lcIdx}`
    const availableSqm = solution[varName] || 0
    const totalAreaSqm = landCoversForParcel[lcIdx].areaSqm
    return {
      landCoverIndex: lcIdx,
      totalAreaSqm,
      usedByExistingSqm: totalAreaSqm - availableSqm,
      availableSqm
    }
  })

  return {
    eligibility: eligibilityExplanation,
    adjustedActions,
    incompatibilityCliques,
    allocations,
    targetAvailability,
    stacks: buildStacksFromSolution(
      solution,
      lpActions,
      landCoversForParcel,
      eligibility,
      compatibilityCheckFn
    )
  }
}

/**
 * Derives stacks from the LP solution by examining co-located actions.
 * @param {object} solution - LP solver result
 * @param {ActionWithArea[]} existingActions
 * @param {LandCover[]} landCoversForParcel
 * @param {Map<string, number[]>} eligibility
 * @param {CompatibilityCheckFn} compatibilityCheckFn
 * @returns {import('./available-area.d.js').Stack[]}
 */
function buildStacksFromSolution(
  solution,
  existingActions,
  landCoversForParcel,
  eligibility,
  compatibilityCheckFn
) {
  // Extract action allocations per land cover from solution
  const allocations = new Map() // lcIdx -> [{actionCode, areaSqm}]

  for (const action of existingActions) {
    const eligibleIndices = eligibility.get(action.actionCode) ?? []
    for (const lcIdx of eligibleIndices) {
      const varName = `x_${action.actionCode}_${lcIdx}`
      const value = solution[varName] || 0
      if (value > 0.001) {
        if (!allocations.has(lcIdx)) allocations.set(lcIdx, [])
        allocations.get(lcIdx).push({
          actionCode: action.actionCode,
          areaSqm: value
        })
      }
    }
  }

  // Group compatible actions on each land cover into stacks
  const stacks = []
  let stackNumber = 1

  for (const [lcIdx, actions] of allocations) {
    // Simple greedy grouping of compatible actions
    const groups = []
    for (const action of actions) {
      let placed = false
      for (const group of groups) {
        const allCompatible = group.every((g) =>
          compatibilityCheckFn(g.actionCode, action.actionCode)
        )
        if (allCompatible) {
          group.push(action)
          placed = true
          break
        }
      }
      if (!placed) {
        groups.push([action])
      }
    }

    for (const group of groups) {
      stacks.push({
        stackNumber: stackNumber++,
        actionCodes: group.map((a) => a.actionCode),
        areaSqm: Math.max(...group.map((a) => a.areaSqm)),
        landCoverIndex: lcIdx
      })
    }
  }

  return stacks
}
