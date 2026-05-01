/**
 * @import { CompatibilityCheckFn, ActionWithArea, AvailableAreaDataRequirements, AvailableAreaForActionLp, DesignationOverlap, DesignationZone } from './available-area.d.js'
 * @import { LandCoverCodes } from '~/src/features/land-cover-codes/land-cover-codes.d.js'
 * @import { LandCover } from '~/src/features/parcel/parcel.d.js'
 */

import _solver from 'javascript-lp-solver'
import { sqmToHaRounded } from '~/src/features/common/helpers/measurement.js'
import { mergeLandCoverCodes } from '~/src/features/land-cover-codes/services/merge-land-cover-codes.js'

/** @type {import('javascript-lp-solver').SolverAPI} */
const solver = /** @type {any} */ (_solver)

export const TARGET_SUFFIX = '__target'

export class InfeasibleAreaError extends Error {
  /**
   * @param {string} sheetId - The land parcel sheet ID
   * @param {string} parcelId - The land parcel ID
   */
  constructor(sheetId, parcelId) {
    super(
      `For land parcel ${sheetId}-${parcelId}, there isn't enough land cover area for the existing actions. Please contact the RPA and give them this message.`
    )
    this.name = 'InfeasibleAreaError'
  }
}

/**
 * Throws an InfeasibleAreaError if the AAC result is infeasible.
 * @param {AvailableAreaForActionLp} lpResult - The AAC result
 * @param {string} sheetId - The land parcel sheet ID
 * @param {string} parcelId - The land parcel ID
 */
export function throwIfInfeasible(lpResult, sheetId, parcelId) {
  if (!lpResult.feasible) {
    throw new InfeasibleAreaError(sheetId, parcelId)
  }
}

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
    landCoversForExistingActions,
    sssiOverlap,
    hfOverlap,
    sssiAndHfOverlap,
    sssiActionEligibility,
    hfActionEligibility
  } = dataRequirements

  // Consolidate duplicate action codes by summing their areas
  existingActions = consolidateActions(existingActions)

  const targetEligibleCodes = mergeLandCoverCodes(
    landCoverCodesForAppliedForAction
  )

  // Determine if any action is ineligible for a designation,
  // which triggers land cover splitting into designation zones
  const hasDesignationData = sssiOverlap && hfOverlap && sssiAndHfOverlap
  const allActionCodes = [
    applyingForAction,
    ...existingActions.map((a) => a.actionCode)
  ]
  const needsSplitting =
    hasDesignationData &&
    allActionCodes.some(
      (code) =>
        sssiActionEligibility?.[code] === false ||
        hfActionEligibility?.[code] === false
    )

  // When designation constraints apply, split land covers into
  // designation zones so the LP can optimally place actions
  let effectiveLandCovers = landCoversForParcel
  /** @type {DesignationZone[] | undefined} */
  let designationZones

  if (needsSplitting) {
    const split = splitLandCoversByDesignation(
      landCoversForParcel,
      sssiOverlap,
      hfOverlap,
      sssiAndHfOverlap,
      targetEligibleCodes
    )
    effectiveLandCovers = split.effectiveLandCovers
    designationZones = split.designationZones
  }

  // Calculate total valid land cover area for the target action
  // taking into account designation zone restrictions
  const targetSssiEligible =
    sssiActionEligibility?.[applyingForAction] !== false
  const targetHfEligible = hfActionEligibility?.[applyingForAction] !== false

  const totalValidLandCoverSqm = effectiveLandCovers.reduce((sum, lc, i) => {
    if (!targetEligibleCodes.includes(lc.landCoverClassCode)) return sum
    if (
      designationZones &&
      !isEligibleForZone(
        designationZones[i],
        targetSssiEligible,
        targetHfEligible
      )
    )
      return sum
    return sum + lc.areaSqm
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
      effectiveLandCovers,
      designationZones,
      sssiActionEligibility,
      hfActionEligibility
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
        landCoversForParcel: effectiveLandCovers,
        eligibility,
        cliques: [],
        compatibilityCheckFn,
        ...(needsSplitting && {
          originalLandCovers: landCoversForParcel,
          designationZones,
          sssiOverlap,
          hfOverlap,
          sssiAndHfOverlap,
          sssiActionEligibility,
          hfActionEligibility
        })
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
    effectiveLandCovers,
    designationZones,
    sssiActionEligibility,
    hfActionEligibility
  )

  // All action codes involved (existing + target) — for clique detection
  const allLabelledCodes = [
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
  const cliques = findMaximalCliques(
    allLabelledCodes,
    wrappedCompatibilityCheck
  )

  // Build and solve the LP model
  const model = buildLpModel(
    targetLabel,
    existingActions,
    effectiveLandCovers,
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
    landCoversForParcel: effectiveLandCovers,
    eligibility,
    cliques,
    compatibilityCheckFn,
    ...(needsSplitting && {
      originalLandCovers: landCoversForParcel,
      designationZones,
      sssiOverlap,
      hfOverlap,
      sssiAndHfOverlap,
      sssiActionEligibility,
      hfActionEligibility
    })
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
 * Consolidates existing actions that share the same action code by summing their areas.
 * @param {ActionWithArea[]} existingActions
 * @returns {ActionWithArea[]}
 */
function consolidateActions(existingActions) {
  const grouped = new Map()
  for (const action of existingActions) {
    grouped.set(
      action.actionCode,
      (grouped.get(action.actionCode) ?? 0) + action.areaSqm
    )
  }
  return Array.from(grouped.entries()).map(([actionCode, areaSqm]) => ({
    actionCode,
    areaSqm
  }))
}

/**
 * Checks if an action is eligible for a given designation zone.
 * @param {DesignationZone} zone
 * @param {boolean} sssiEligible - Whether the action is eligible for SSSI land
 * @param {boolean} hfEligible - Whether the action is eligible for HF land
 * @returns {boolean}
 */
function isEligibleForZone(zone, sssiEligible, hfEligible) {
  switch (zone) {
    case 'neither':
      return true
    case 'sssi_only':
      return sssiEligible
    case 'hf_only':
      return hfEligible
    case 'sssi_and_hf':
      return sssiEligible && hfEligible
    default:
      return true
  }
}

/**
 * Filters land cover indices by designation zone eligibility.
 * @param {number[]} baseIndices
 * @param {DesignationZone[] | undefined} designationZones
 * @param {boolean} sssiEligible
 * @param {boolean} hfEligible
 * @returns {number[]}
 */
function filterIndicesByDesignation(
  baseIndices,
  designationZones,
  sssiEligible,
  hfEligible
) {
  if (!designationZones) return baseIndices
  return baseIndices.filter((i) =>
    isEligibleForZone(designationZones[i], sssiEligible, hfEligible)
  )
}

/**
 * Builds a map of actionCode -> array of parcel land cover indices the action is eligible for.
 * Handles unreliable land cover data by checking both landCoverCode and landCoverClassCode.
 * When designation zones are active, filters indices based on each action's SSSI/HF eligibility.
 * @param {string} targetLabel
 * @param {ActionWithArea[]} existingActions
 * @param {LandCoverCodes[]} landCoverCodesForAppliedForAction
 * @param {{[key: string]: LandCoverCodes[]}} landCoversForExistingActions
 * @param {LandCover[]} landCoversForParcel
 * @param {DesignationZone[]} [designationZones] - Zone tags for each effective land cover entry
 * @param {{[actionCode: string]: boolean}} [sssiActionEligibility]
 * @param {{[actionCode: string]: boolean}} [hfActionEligibility]
 * @returns {Map<string, number[]>} actionCode -> array of land cover indices
 */
function buildEligibilityMap(
  targetLabel,
  existingActions,
  landCoverCodesForAppliedForAction,
  landCoversForExistingActions,
  landCoversForParcel,
  designationZones,
  sssiActionEligibility,
  hfActionEligibility
) {
  const eligibility = new Map()

  // Resolve the real action code from the target label
  const targetRealCode = targetLabel.endsWith(TARGET_SUFFIX)
    ? targetLabel.slice(0, -TARGET_SUFFIX.length)
    : targetLabel

  // Build for target action (stored under the target label to avoid collisions)
  const targetMerged = mergeLandCoverCodes(landCoverCodesForAppliedForAction)
  const targetIndices = getEligibleLandCoverIndices(
    targetMerged,
    landCoversForParcel
  )

  const targetSssiEligible = sssiActionEligibility?.[targetRealCode] !== false
  const targetHfEligible = hfActionEligibility?.[targetRealCode] !== false

  eligibility.set(
    targetLabel,
    filterIndicesByDesignation(
      targetIndices,
      designationZones,
      targetSssiEligible,
      targetHfEligible
    )
  )

  // Build for each existing action
  for (const action of existingActions) {
    const actionLandCoverCodes = landCoversForExistingActions[action.actionCode]
    if (actionLandCoverCodes) {
      const merged = mergeLandCoverCodes(actionLandCoverCodes)
      const indices = getEligibleLandCoverIndices(merged, landCoversForParcel)

      const sssiEligible = sssiActionEligibility?.[action.actionCode] !== false
      const hfEligible = hfActionEligibility?.[action.actionCode] !== false

      eligibility.set(
        action.actionCode,
        filterIndicesByDesignation(
          indices,
          designationZones,
          sssiEligible,
          hfEligible
        )
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
 * Splits land covers into designation zones (neither, SSSI-only, HF-only, both)
 * for land covers the target action is eligible for. This allows the LP to
 * optimally place actions based on their designation eligibility.
 * @param {LandCover[]} landCoversForParcel - Full parcel land covers
 * @param {DesignationOverlap[]} sssiOverlap - SSSI intersection per land cover
 * @param {DesignationOverlap[]} hfOverlap - HF intersection per land cover
 * @param {DesignationOverlap[]} sssiAndHfOverlap - SSSI+HF intersection per land cover
 * @param {string[]} targetEligibleCodes - Merged land cover codes the target can use
 * @returns {{ effectiveLandCovers: LandCover[], designationZones: DesignationZone[] }}
 */
function splitLandCoversByDesignation(
  landCoversForParcel,
  sssiOverlap,
  hfOverlap,
  sssiAndHfOverlap,
  targetEligibleCodes
) {
  /** @type {LandCover[]} */
  const effectiveLandCovers = []
  /** @type {DesignationZone[]} */
  const designationZones = []

  for (let i = 0; i < landCoversForParcel.length; i++) {
    const lc = landCoversForParcel[i]

    if (!targetEligibleCodes.includes(lc.landCoverClassCode)) {
      // Land cover not eligible for the target — pass through unchanged
      effectiveLandCovers.push({
        landCoverClassCode: lc.landCoverClassCode,
        areaSqm: lc.areaSqm
      })
      designationZones.push('neither')
      continue
    }

    // Derive four zones via inclusion-exclusion
    const sssi = sssiOverlap[i].areaSqm
    const hf = hfOverlap[i].areaSqm
    const both = sssiAndHfOverlap[i].areaSqm

    const bothArea = Math.max(0, both)
    const sssiOnlyArea = Math.max(0, sssi - both)
    const hfOnlyArea = Math.max(0, hf - both)
    const neitherArea = Math.max(0, lc.areaSqm - sssi - hf + both)

    /** @type {[DesignationZone, number][]} */
    const zones = [
      ['neither', neitherArea],
      ['sssi_only', sssiOnlyArea],
      ['hf_only', hfOnlyArea],
      ['sssi_and_hf', bothArea]
    ]

    for (const [zone, area] of zones) {
      if (area > 0) {
        effectiveLandCovers.push({
          landCoverClassCode: lc.landCoverClassCode,
          areaSqm: area
        })
        designationZones.push(zone)
      }
    }
  }

  return { effectiveLandCovers, designationZones }
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
