/**
 * @import { AacContext, AacExplanations, ActionWithArea, CompatibilityCheckFn } from './available-area.d.js'
 * @import { CodeToString, EligibilityEntry } from './available-area.d.js'
 * @import { ExplanationSection } from './explanations.d.js'
 * @import { LandCover } from '~/src/features/parcel/parcel.d.js'
 */

import { sqmToHaRounded } from '~/src/features/common/helpers/measurement.js'
import { TARGET_SUFFIX } from './availableArea.lp.js'

/**
 * Formats AAC context into human-readable explanation sections that walk
 * a user through the calculation step by step.
 * @param {AacContext|null} aacContext - Context data from findMaximumAvailableArea
 * @param {object} displayContext
 * @param {string} displayContext.targetAction - The action code being applied for
 * @param {number} displayContext.availableAreaSqm - The final available area result
 * @param {number} displayContext.totalValidLandCoverSqm - Total eligible land cover area
 * @param {CodeToString} displayContext.landCoverToString - Maps land cover codes to descriptions
 * @returns {ExplanationSection[]}
 */
export function formatExplanationSections(aacContext, displayContext) {
  const {
    targetAction,
    availableAreaSqm,
    totalValidLandCoverSqm,
    landCoverToString
  } = displayContext

  if (!aacContext) {
    return [
      buildResultSection(targetAction, availableAreaSqm, totalValidLandCoverSqm)
    ]
  }

  const explanations = deriveExplanations(aacContext)
  const { landCoversForParcel } = aacContext

  const sections = []

  sections.push(buildEligibilitySection(explanations, landCoverToString))

  if (explanations.adjustedActions.length > 0) {
    sections.push(buildAdjustedActionsSection(explanations))
  }

  if (explanations.incompatibilityCliques.length > 0) {
    sections.push(buildIncompatibilitySection(explanations))
  }

  if (explanations.allocations.length > 0) {
    sections.push(
      buildAllocationsSection(
        explanations,
        landCoversForParcel,
        landCoverToString
      )
    )
  }

  sections.push(
    buildTargetAvailabilitySection(
      explanations,
      targetAction,
      landCoversForParcel,
      landCoverToString
    ),
    buildResultSection(targetAction, availableAreaSqm, totalValidLandCoverSqm)
  )

  if (explanations.stacks.length > 0) {
    sections.push(
      buildStacksSection(explanations, landCoversForParcel, landCoverToString)
    )
  }

  return sections
}

/**
 * Derives structured explanations from the AAC context.
 * @param {AacContext} aacContext
 * @returns {AacExplanations}
 */
function deriveExplanations(aacContext) {
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
    const displayCode = actionCode.endsWith(TARGET_SUFFIX)
      ? actionCode.slice(0, -TARGET_SUFFIX.length)
      : actionCode
    eligibilityExplanation[displayCode] = indices.map((lcIdx) => ({
      landCoverIndex: lcIdx,
      landCoverClassCode: landCoversForParcel[lcIdx].landCoverClassCode,
      areaSqm: landCoversForParcel[lcIdx].areaSqm
    }))
  }

  // No solution means no LP was run (e.g. no existing actions)
  if (!solution) {
    const targetIndices = eligibility.get(targetLabel) ?? []
    return {
      eligibility: eligibilityExplanation,
      adjustedActions: [],
      incompatibilityCliques: [],
      allocations: [],
      targetAvailability: targetIndices.map((lcIdx) => ({
        landCoverIndex: lcIdx,
        totalAreaSqm: landCoversForParcel[lcIdx].areaSqm,
        usedByExistingSqm: 0,
        availableSqm: landCoversForParcel[lcIdx].areaSqm
      })),
      stacks: []
    }
  }

  // Existing actions
  const adjustedActions = existingActions.map((a) => ({
    actionCode: a.actionCode,
    areaSqm: a.areaSqm
  }))

  // Incompatibility cliques (only those with 2+ members)
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
  for (const action of existingActions) {
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
  const targetIndices = eligibility.get(targetLabel) ?? []
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
      existingActions,
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
  const allocationsByLc = buildAllocationsByLandCover(
    existingActions,
    eligibility,
    solution
  )
  const stacks = []
  let stackNumber = 1

  for (const [lcIdx, actions] of allocationsByLc) {
    for (const group of groupByCompatibility(actions, compatibilityCheckFn)) {
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
      if (value > 0.001) {
        if (!allocations.has(lcIdx)) allocations.set(lcIdx, [])
        allocations
          .get(lcIdx)
          .push({ actionCode: action.actionCode, areaSqm: value })
      }
    }
  }
  return allocations
}

/**
 * @param {{actionCode: string, areaSqm: number}[]} actions
 * @param {CompatibilityCheckFn} compatibilityCheckFn
 * @returns {{actionCode: string, areaSqm: number}[][]}
 */
function groupByCompatibility(actions, compatibilityCheckFn) {
  const groups = []
  for (const action of actions) {
    const compatibleGroup = groups.find((group) =>
      group.every((g) => compatibilityCheckFn(g.actionCode, action.actionCode))
    )
    if (compatibleGroup) {
      compatibleGroup.push(action)
    } else {
      groups.push([action])
    }
  }
  return groups
}

/**
 * @param {AacExplanations} explanations
 * @param {CodeToString} landCoverToString
 * @returns {ExplanationSection}
 */
function buildEligibilitySection(explanations, landCoverToString) {
  const content = []

  for (const [actionCode, entries] of Object.entries(
    explanations.eligibility
  )) {
    if (entries.length === 0) {
      content.push(`${actionCode}: no eligible land covers on this parcel`)
    } else {
      const landCoverList = entries
        .map(
          (e) =>
            `${landCoverToString(e.landCoverClassCode)} (${sqmToHaRounded(e.areaSqm)} ha)`
        )
        .join(', ')
      content.push(`${actionCode}: ${landCoverList}`)
    }
  }

  return {
    title: 'Eligible land covers per action',
    content
  }
}

/**
 * @param {AacExplanations} explanations
 * @returns {ExplanationSection}
 */
function buildAdjustedActionsSection(explanations) {
  const content = explanations.adjustedActions.map(
    (adj) => `${adj.actionCode}: ${sqmToHaRounded(adj.areaSqm)} ha`
  )

  return {
    title: 'Existing actions',
    content
  }
}

/**
 * @param {AacExplanations} explanations
 * @returns {ExplanationSection}
 */
function buildIncompatibilitySection(explanations) {
  const content = explanations.incompatibilityCliques.map(
    (clique) => `${clique.join(', ')} cannot share the same land`
  )

  return {
    title: 'Incompatible action groups',
    content
  }
}

/**
 * @param {AacExplanations} explanations
 * @param {LandCover[]} landCoversForParcel
 * @param {CodeToString} landCoverToString
 * @returns {ExplanationSection}
 */
function buildAllocationsSection(
  explanations,
  landCoversForParcel,
  landCoverToString
) {
  const byAction = new Map()
  for (const alloc of explanations.allocations) {
    if (!byAction.has(alloc.actionCode)) byAction.set(alloc.actionCode, [])
    byAction.get(alloc.actionCode).push(alloc)
  }

  const content = []
  for (const [actionCode, allocs] of byAction) {
    const parts = allocs.map((a) => {
      const lc = landCoversForParcel[a.landCoverIndex]
      return `${sqmToHaRounded(a.areaSqm)} ha on ${landCoverToString(lc.landCoverClassCode)}`
    })
    content.push(`${actionCode}: ${parts.join(', ')}`)
  }

  return {
    title: 'Optimal placement of existing actions',
    content
  }
}

/**
 * @param {AacExplanations} explanations
 * @param {string} targetAction
 * @param {LandCover[]} landCoversForParcel
 * @param {CodeToString} landCoverToString
 * @returns {ExplanationSection}
 */
function buildTargetAvailabilitySection(
  explanations,
  targetAction,
  landCoversForParcel,
  landCoverToString
) {
  const content = explanations.targetAvailability.map((ta) => {
    const lc = landCoversForParcel[ta.landCoverIndex]
    const lcName = landCoverToString(lc.landCoverClassCode)
    return `${lcName}: ${sqmToHaRounded(ta.totalAreaSqm)} ha total, ${sqmToHaRounded(ta.usedByExistingSqm)} ha used by existing actions, ${sqmToHaRounded(ta.availableSqm)} ha available`
  })

  return {
    title: `Available land for ${targetAction}`,
    content
  }
}

/**
 * @param {string} targetAction
 * @param {number} availableAreaSqm
 * @param {number} totalValidLandCoverSqm
 * @returns {ExplanationSection}
 */
function buildResultSection(
  targetAction,
  availableAreaSqm,
  totalValidLandCoverSqm
) {
  return {
    title: 'Result',
    content: [
      `Total eligible land cover for ${targetAction}: ${sqmToHaRounded(totalValidLandCoverSqm)} ha`,
      `Maximum available area for ${targetAction}: ${sqmToHaRounded(availableAreaSqm)} ha`
    ]
  }
}

/**
 * @param {AacExplanations} explanations
 * @param {LandCover[]} landCoversForParcel
 * @param {CodeToString} landCoverToString
 * @returns {ExplanationSection}
 */
function buildStacksSection(
  explanations,
  landCoversForParcel,
  landCoverToString
) {
  const content = explanations.stacks.map((stack) => {
    let lcName = 'Land cover unknown'
    if (stack.landCoverIndex !== undefined) {
      const lc = landCoversForParcel[stack.landCoverIndex]
      lcName = landCoverToString(lc.landCoverClassCode)
    }
    return `Stack ${stack.stackNumber}: ${stack.actionCodes.join(' + ')} on ${lcName} (${sqmToHaRounded(stack.areaSqm)} ha)`
  })

  return {
    title: 'Ephemeral stacks',
    content
  }
}
