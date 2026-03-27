/**
 * @import { CompatibilityCheckFn, ActionWithArea, AvailableAreaDataRequirements, AvailableAreaForAction } from './available-area.d.js'
 * @import { LandCoverCodes } from '~/src/features/land-cover-codes/land-cover-codes.d.js'
 * @import { LandCover } from '~/src/features/parcel/parcel.d.js'
 */

import solver from 'javascript-lp-solver'
import { sqmToHaRounded } from '~/src/features/common/helpers/measurement.js'

/**
 * Returns the unique set of land cover class codes from a LandCoverCodes array.
 * @param {LandCoverCodes[]} landCoverCodes
 * @returns {Set<string>}
 */
function getEligibleClassCodes(landCoverCodes) {
  const codes = new Set()
  for (const entry of landCoverCodes) {
    codes.add(entry.landCoverClassCode)
  }
  return codes
}

/**
 * Builds a land cover area lookup from the parcel composition.
 * @param {LandCover[]} landCoversForParcel
 * @returns {Map<string, number>}
 */
function buildParcelAreaMap(landCoversForParcel) {
  const map = new Map()
  for (const lc of landCoversForParcel) {
    map.set(
      lc.landCoverClassCode,
      (map.get(lc.landCoverClassCode) ?? 0) + lc.areaSqm
    )
  }
  return map
}

/**
 * Computes the total parcel area on land covers that an action is eligible for
 * but the target action is not. Compatible actions can stack on non-target land,
 * so each action independently gets credit for the full non-target area.
 * @param {Set<string>} actionEligible
 * @param {Set<string>} targetEligible
 * @param {Map<string, number>} parcelArea
 * @returns {number}
 */
function computeNonTargetEligibleArea(
  actionEligible,
  targetEligible,
  parcelArea
) {
  let total = 0
  for (const [lc, area] of parcelArea) {
    if (actionEligible.has(lc) && !targetEligible.has(lc)) {
      total += area
    }
  }
  return total
}

/**
 * Enumerates all subsets of actions where every pair is mutually compatible.
 * These represent valid "stack configurations" — groups of actions that can
 * share the same physical land.
 * @param {{ actionCode: string, areaSqm: number }[]} actions
 * @param {CompatibilityCheckFn} compatibilityCheckFn
 * @returns {{ actionCode: string, areaSqm: number }[][]}
 */
function enumerateCompatibleSets(actions, compatibilityCheckFn) {
  const n = actions.length
  const sets = []

  for (let mask = 1; mask < 1 << n; mask++) {
    const subset = []
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) subset.push(actions[i])
    }

    let allCompatible = true
    for (let i = 0; i < subset.length && allCompatible; i++) {
      for (let j = i + 1; j < subset.length && allCompatible; j++) {
        if (!compatibilityCheckFn(subset[i].actionCode, subset[j].actionCode)) {
          allCompatible = false
        }
      }
    }

    if (allCompatible) {
      sets.push(subset)
    }
  }

  return sets
}

/**
 * Builds and solves an LP to find the minimum physical footprint needed to
 * accommodate all revised action areas on target land, accounting for stacking
 * (compatible actions can share physical land).
 *
 * The LP uses "stack type" variables — one for each valid compatible subset.
 * Each variable represents the area of land devoted to that stack configuration.
 * Minimizing the sum of all stack areas gives the minimum physical footprint.
 *
 * @param {{ actionCode: string, areaSqm: number }[]} revisedActions
 * @param {CompatibilityCheckFn} compatibilityCheckFn
 * @param {number} totalValidLandCoverSqm
 * @returns {number} minimum footprint in sqm
 */
function solveMinimumFootprint(
  revisedActions,
  compatibilityCheckFn,
  totalValidLandCoverSqm
) {
  const stackTypes = enumerateCompatibleSets(
    revisedActions,
    compatibilityCheckFn
  )

  /** @type {Record<string, {min?: number, max?: number}>} */
  const constraints = {}

  /** @type {Record<string, Record<string, number>>} */
  const variables = {}

  // Each action's revised area must be covered by stack types containing it
  for (const action of revisedActions) {
    constraints[`cover_${action.actionCode}`] = { min: action.areaSqm }
  }

  // Total footprint cannot exceed total target land
  constraints.totalCap = { max: totalValidLandCoverSqm }

  // One variable per stack type
  stackTypes.forEach((type, i) => {
    /** @type {Record<string, number>} */
    const coeffs = { footprint: 1, totalCap: 1 }
    for (const action of type) {
      coeffs[`cover_${action.actionCode}`] = 1
    }
    variables[`s${i}`] = coeffs
  })

  const model = {
    optimize: 'footprint',
    opType: /** @type {const} */ ('min'),
    constraints,
    variables
  }

  const result = solver.Solve(model)
  return result.feasible ? (result.result ?? 0) : 0
}

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

  const targetEligible = getEligibleClassCodes(
    landCoverCodesForAppliedForAction
  )
  const parcelArea = buildParcelAreaMap(landCoversForParcel)

  // Total valid land cover area for the target action
  const totalValidLandCoverSqm = landCoversForParcel
    .filter((lc) => targetEligible.has(lc.landCoverClassCode))
    .reduce((sum, lc) => sum + lc.areaSqm, 0)

  if (!existingActions || existingActions.length === 0) {
    return {
      availableAreaHectares: sqmToHaRounded(totalValidLandCoverSqm),
      stacks: []
    }
  }

  // Compute revised areas: subtract non-target eligible parcel area per action
  const revisedActions = []
  for (const action of existingActions) {
    const codes = landCoversForExistingActions[action.actionCode]
    if (!codes || codes.length === 0) continue

    const isCompatible = compatibilityCheckFn(
      action.actionCode,
      applyingForAction
    )
    if (isCompatible) continue

    const actionEligible = getEligibleClassCodes(codes)
    const nonTargetArea = computeNonTargetEligibleArea(
      actionEligible,
      targetEligible,
      parcelArea
    )
    const revisedArea = Math.max(0, action.areaSqm - nonTargetArea)

    if (revisedArea > 0) {
      revisedActions.push({
        actionCode: action.actionCode,
        areaSqm: revisedArea
      })
    }
  }

  if (revisedActions.length === 0) {
    return {
      availableAreaHectares: sqmToHaRounded(totalValidLandCoverSqm),
      stacks: []
    }
  }

  const footprint = solveMinimumFootprint(
    revisedActions,
    compatibilityCheckFn,
    totalValidLandCoverSqm
  )

  const availableAreaSqm = Math.max(0, totalValidLandCoverSqm - footprint)

  return {
    availableAreaHectares: sqmToHaRounded(availableAreaSqm),
    stacks: []
  }
}
