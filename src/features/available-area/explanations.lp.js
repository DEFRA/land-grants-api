/**
 * @import { AacExplanations } from './available-area.d.js'
 * @import { CodeToString } from './available-area.d.js'
 * @import { ExplanationSection } from './explanations.d.js'
 * @import { LandCover } from '~/src/features/parcel/parcel.d.js'
 */

import { sqmToHaRounded } from '~/src/features/common/helpers/measurement.js'

/**
 * Formats the structured AAC explanations into human-readable explanation
 * sections that walk a user through the calculation step by step.
 * @param {AacExplanations} explanations - Structured explanations from findMaximumAvailableArea
 * @param {object} context
 * @param {string} context.targetAction - The action code being applied for
 * @param {number} context.availableAreaSqm - The final available area result
 * @param {number} context.totalValidLandCoverSqm - Total eligible land cover area
 * @param {LandCover[]} context.landCoversForParcel - The parcel's land covers
 * @param {CodeToString} context.landCoverToString - Maps land cover codes to descriptions
 * @returns {ExplanationSection[]}
 */
export function formatExplanationSections(explanations, context) {
  const {
    targetAction,
    availableAreaSqm,
    totalValidLandCoverSqm,
    landCoversForParcel,
    landCoverToString
  } = context

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
    )
  )

  sections.push(
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
  const content = []

  for (const adj of explanations.adjustedActions) {
    if (adj.wasExcluded) {
      content.push(
        `${adj.actionCode}: excluded (no eligible land covers on parcel)`
      )
    } else if (adj.wasCapped) {
      content.push(
        `${adj.actionCode}: area capped from ${sqmToHaRounded(adj.originalAreaSqm)} ha to ${sqmToHaRounded(adj.adjustedAreaSqm)} ha (limited by available land cover)`
      )
    } else {
      content.push(
        `${adj.actionCode}: ${sqmToHaRounded(adj.originalAreaSqm)} ha (no adjustment needed)`
      )
    }
  }

  return {
    title: 'Existing action adjustments',
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
  // Group allocations by action code
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
    const lc = landCoversForParcel[stack.landCoverIndex]
    const lcName = landCoverToString(lc.landCoverClassCode)
    return `Stack ${stack.stackNumber}: ${stack.actionCodes.join(' + ')} on ${lcName} (${sqmToHaRounded(stack.areaSqm)} ha)`
  })

  return {
    title: 'Ephemeral stacks',
    content
  }
}
