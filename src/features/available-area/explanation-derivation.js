/**
 * @import { AacContext, AacExplanations, ActionWithArea, CompatibilityCheckFn } from './available-area.d.js'
 * @import { EligibilityEntry } from './available-area.d.js'
 * @import { LandCover } from '~/src/features/parcel/parcel.d.js'
 */

import { TARGET_SUFFIX } from './availableArea.js'

/**
 * Strips the target suffix from an action code if present.
 * @param {string} code
 * @returns {string}
 */
export function stripTargetSuffix(code) {
  return code.endsWith(TARGET_SUFFIX)
    ? code.slice(0, -TARGET_SUFFIX.length)
    : code
}

/**
 * Derives structured explanations from the AAC context.
 * @param {AacContext} aacContext
 * @returns {AacExplanations}
 */
export function deriveExplanations(aacContext) {
  const {
    solution,
    targetLabel,
    existingActions,
    landCoversForParcel,
    eligibility,
    cliques,
    compatibilityCheckFn
  } = aacContext

  // Eligibility: which land covers each action can use
  const eligibilityExplanation =
    /** @type { Record<string, EligibilityEntry[]> } */ ({})
  for (const [actionCode, indices] of eligibility) {
    const displayCode = stripTargetSuffix(actionCode)
    eligibilityExplanation[displayCode] = indices.map((lcIdx) => ({
      landCoverIndex: lcIdx,
      landCoverClassCode: landCoversForParcel[lcIdx].landCoverClassCode,
      areaSqm: landCoversForParcel[lcIdx].areaSqm
    }))
  }

  // Existing actions (always derived, even without a solution)
  const adjustedActions = existingActions.map((a) => ({
    actionCode: a.actionCode,
    areaSqm: a.areaSqm
  }))

  // Incompatibility cliques (only those with 2+ members)
  const incompatibilityCliques = cliques
    .filter((c) => c.length >= 2)
    .map((c) => c.map(stripTargetSuffix))

  // No solution means no LP was run or LP was infeasible
  if (!solution) {
    const noSolutionTargetIndices = eligibility.get(targetLabel) ?? []
    return {
      eligibility: eligibilityExplanation,
      adjustedActions,
      incompatibilityCliques,
      allocations: [],
      targetAvailability: noSolutionTargetIndices.map((lcIdx) => ({
        landCoverIndex: lcIdx,
        totalAreaSqm: landCoversForParcel[lcIdx].areaSqm,
        usedByExistingSqm: 0,
        availableSqm: landCoversForParcel[lcIdx].areaSqm
      })),
      stacks: []
    }
  }

  return {
    eligibility: eligibilityExplanation,
    adjustedActions,
    incompatibilityCliques,
    allocations: buildAllocationsFromSolution(
      existingActions,
      eligibility,
      solution
    ),
    targetAvailability: buildTargetAvailabilityFromSolution(
      eligibility,
      targetLabel,
      solution,
      landCoversForParcel
    ),
    stacks: buildStacksFromSolution(
      solution,
      existingActions,
      eligibility,
      compatibilityCheckFn
    )
  }
}

/**
 * Builds target availability per-land-cover breakdown from the LP solution.
 * @param {Map<string, number[]>} eligibility
 * @param {string} targetLabel
 * @param {object} solution
 * @param {LandCover[]} landCoversForParcel
 * @returns {{landCoverIndex: number, totalAreaSqm: number, usedByExistingSqm: number, availableSqm: number}[]}
 */
function buildTargetAvailabilityFromSolution(
  eligibility,
  targetLabel,
  solution,
  landCoversForParcel
) {
  const targetIndices = eligibility.get(targetLabel) ?? []
  return targetIndices.map((lcIdx) => {
    const availableSqm = solution[`t_${lcIdx}`] || 0
    const totalAreaSqm = landCoversForParcel[lcIdx].areaSqm
    return {
      landCoverIndex: lcIdx,
      totalAreaSqm,
      usedByExistingSqm: totalAreaSqm - availableSqm,
      availableSqm
    }
  })
}

/**
 * Builds flat allocations array from the LP solution.
 * @param {ActionWithArea[]} existingActions
 * @param {Map<string, number[]>} eligibility
 * @param {object} solution
 * @returns {{actionCode: string, landCoverIndex: number, areaSqm: number}[]}
 */
function buildAllocationsFromSolution(existingActions, eligibility, solution) {
  const allocations = []
  for (const action of existingActions) {
    const eligibleIndices = eligibility.get(action.actionCode) ?? []
    for (const lcIdx of eligibleIndices) {
      const value = solution[`x_${action.actionCode}_${lcIdx}`] || 0
      if (value > 0.001) {
        allocations.push({
          actionCode: action.actionCode,
          landCoverIndex: lcIdx,
          areaSqm: value
        })
      }
    }
  }
  return allocations
}

/**
 * Derives stacks from the LP solution by examining co-located actions.
 * Uses a "peeling" algorithm: on each land cover, repeatedly peel off the
 * thinnest compatible layer until all area is accounted for. This produces
 * stacks that partition the land cover — their areas sum to the total used
 * area rather than overlapping.
 * @param {object} solution - LP solver result
 * @param {ActionWithArea[]} existingActions
 * @param {Map<string, number[]>} eligibility
 * @param {CompatibilityCheckFn} compatibilityCheckFn
 * @returns {import('./available-area.d.js').Stack[]}
 */
function buildStacksFromSolution(
  solution,
  existingActions,
  eligibility,
  compatibilityCheckFn
) {
  const allocationsByLc = buildAllocationsByLandCover(
    existingActions,
    eligibility,
    solution
  )
  const stacks = []
  let stackNumber = 1

  for (const [lcIdx, actions] of allocationsByLc) {
    const lcStacks = buildStacksForLandCover(actions, compatibilityCheckFn)
    for (const stack of lcStacks) {
      stacks.push({
        stackNumber,
        actionCodes: stack.actionCodes,
        areaSqm: stack.areaSqm,
        landCoverIndex: lcIdx
      })
      stackNumber++
    }
  }

  return stacks
}

/**
 * Finds the action with the smallest remaining area in a map.
 * @param {Map<string, number>} remaining
 * @returns {{ code: string, area: number }}
 */
function findSmallestAction(remaining) {
  let smallestCode = /** @type {string} */ ('')
  let smallestArea = Infinity
  for (const [code, area] of remaining) {
    if (area < smallestArea) {
      smallestArea = area
      smallestCode = code
    }
  }
  return { code: smallestCode, area: smallestArea }
}

/**
 * Builds stacks for a single land cover by peeling off compatible layers.
 * Each iteration finds the action with the smallest remaining area, groups
 * it with all compatible actions, and peels off that area as a stack.
 * @param {{actionCode: string, areaSqm: number}[]} actions
 * @param {CompatibilityCheckFn} compatibilityCheckFn
 * @returns {{actionCodes: string[], areaSqm: number}[]}
 */
function buildStacksForLandCover(actions, compatibilityCheckFn) {
  /** @type {Map<string, number>} */
  const remaining = new Map(actions.map((a) => [a.actionCode, a.areaSqm]))
  const stacks = []

  while (remaining.size > 0) {
    const { code: smallestCode, area: smallestArea } =
      findSmallestAction(remaining)

    // Build a maximal compatible group containing the smallest action
    const group = [smallestCode]
    const candidates = [...remaining.keys()]
      .filter((c) => c !== smallestCode)
      .sort(
        (a, b) =>
          /** @type {number} */ (remaining.get(b)) -
          /** @type {number} */ (remaining.get(a))
      )

    for (const candidate of candidates) {
      if (group.every((g) => compatibilityCheckFn(g, candidate))) {
        group.push(candidate)
      }
    }

    stacks.push({ actionCodes: group, areaSqm: smallestArea })

    // Subtract the peeled area from all group members
    for (const code of group) {
      const newArea = /** @type {number} */ (remaining.get(code)) - smallestArea
      if (newArea <= 0.001) {
        remaining.delete(code)
      } else {
        remaining.set(code, newArea)
      }
    }
  }

  // Sort by area descending so the largest stacks appear first
  stacks.sort((a, b) => b.areaSqm - a.areaSqm)
  return stacks
}

/**
 * @param {ActionWithArea[]} existingActions
 * @param {Map<string, number[]>} eligibility
 * @param {object} solution
 * @returns {Map<number, {actionCode: string, areaSqm: number}[]>}
 */
function buildAllocationsByLandCover(existingActions, eligibility, solution) {
  const allocations = new Map()
  for (const action of existingActions) {
    const eligibleIndices = eligibility.get(action.actionCode) ?? []
    for (const lcIdx of eligibleIndices) {
      const value = solution[`x_${action.actionCode}_${lcIdx}`] || 0
      if (value <= 0.001) {
        continue
      }

      if (!allocations.has(lcIdx)) {
        allocations.set(lcIdx, [])
      }
      allocations
        .get(lcIdx)
        .push({ actionCode: action.actionCode, areaSqm: value })
    }
  }
  return allocations
}
