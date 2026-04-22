/**
 * @import { AacContext, AacExplanations } from './available-area.d.js'
 * @import { CodeToString } from './available-area.d.js'
 * @import { ExplanationSection } from './explanations.d.js'
 */

import { deriveExplanations } from './explanation-derivation.js'
import {
  buildApplicationSection,
  buildAdjustedActionsSection,
  buildLandCoversOnParcelSection,
  buildDesignationAreasSection,
  buildDesignationEligibilitySection,
  buildEligibilitySection,
  buildIncompatibilitySection,
  buildAllocationsSection,
  buildTargetAvailabilitySection,
  buildResultSection,
  buildStacksSection
} from './explanation-sections.js'

/**
 * Creates basic explanation section
 * @param {string} title
 * @param {string[]} content
 * @returns {ExplanationSection}
 */
export const createExplanationSection = (title, content) => ({
  title,
  content
})

/**
 * Formats AAC context into human-readable explanation sections that walk
 * a user through the calculation step by step.
 * @param {AacContext|null} aacContext - Context data from findMaximumAvailableArea
 * @param {object} displayContext
 * @param {string} displayContext.targetAction - The action code being applied for
 * @param {number} displayContext.availableAreaSqm - The final available area result
 * @param {number} displayContext.totalValidLandCoverSqm - Total eligible land cover area
 * @param {CodeToString} displayContext.landCoverToString - Maps land cover codes to descriptions
 * @param {boolean} displayContext.feasible - Whether the LP was feasible
 * @returns {ExplanationSection[]}
 */
export function formatExplanationSections(aacContext, displayContext) {
  const {
    targetAction,
    availableAreaSqm,
    totalValidLandCoverSqm,
    landCoverToString,
    feasible
  } = displayContext

  if (!aacContext) {
    return [
      buildResultSection(targetAction, availableAreaSqm, totalValidLandCoverSqm)
    ]
  }

  const explanations = deriveExplanations(aacContext)

  const sections = [
    ...buildContextSections(
      explanations,
      aacContext,
      targetAction,
      landCoverToString
    )
  ]

  // Early return if infeasible
  if (!feasible) {
    sections.push(
      createExplanationSection('Error - AAC not possible', [
        'It was not possible to allocate the existing actions to valid land covers. This requires a manual review and existing agreements may need adjusting.'
      ]),
      buildResultSection(targetAction, availableAreaSqm, totalValidLandCoverSqm)
    )
    return sections
  }

  sections.push(
    ...buildFeasibleSolutionSections(
      explanations,
      aacContext,
      targetAction,
      availableAreaSqm,
      totalValidLandCoverSqm,
      landCoverToString
    )
  )

  return sections
}

/**
 * Builds the context sections: application, existing actions, land covers,
 * designations, eligibility, and incompatibility.
 * @param {AacExplanations} explanations
 * @param {AacContext} aacContext
 * @param {string} targetAction
 * @param {CodeToString} landCoverToString
 * @returns {ExplanationSection[]}
 */
function buildContextSections(
  explanations,
  aacContext,
  targetAction,
  landCoverToString
) {
  const {
    landCoversForParcel,
    originalLandCovers,
    designationZones,
    sssiOverlap,
    hfOverlap,
    sssiAndHfOverlap,
    sssiActionEligibility,
    hfActionEligibility,
    targetLabel,
    existingActions
  } = aacContext

  const hasDesignationSplitting = !!(originalLandCovers && designationZones)

  const sections = []

  sections.push(buildApplicationSection(targetAction))

  if (explanations.adjustedActions.length > 0) {
    sections.push(buildAdjustedActionsSection(explanations))
  }

  sections.push(
    buildLandCoversOnParcelSection(
      hasDesignationSplitting ? originalLandCovers : landCoversForParcel,
      landCoverToString
    )
  )

  if (hasDesignationSplitting) {
    sections.push(
      buildDesignationAreasSection(
        originalLandCovers,
        landCoverToString,
        sssiOverlap,
        hfOverlap,
        sssiAndHfOverlap
      ),
      buildDesignationEligibilitySection(
        targetLabel,
        existingActions,
        sssiActionEligibility,
        hfActionEligibility
      )
    )
  }

  sections.push(
    buildEligibilitySection(
      explanations,
      landCoverToString,
      hasDesignationSplitting ? designationZones : undefined
    )
  )

  if (explanations.incompatibilityCliques.length > 0) {
    sections.push(buildIncompatibilitySection(explanations))
  }

  return sections
}

/**
 * Builds sections for a feasible LP solution (allocations, target availability, stacks).
 * @param {AacExplanations} explanations
 * @param {AacContext} aacContext
 * @param {string} targetAction
 * @param {number} availableAreaSqm
 * @param {number} totalValidLandCoverSqm
 * @param {CodeToString} landCoverToString
 * @returns {ExplanationSection[]}
 */
function buildFeasibleSolutionSections(
  explanations,
  aacContext,
  targetAction,
  availableAreaSqm,
  totalValidLandCoverSqm,
  landCoverToString
) {
  const { landCoversForParcel, designationZones } = aacContext
  const sections = []

  if (explanations.allocations.length > 0) {
    sections.push(
      buildAllocationsSection(
        explanations,
        landCoversForParcel,
        landCoverToString,
        designationZones
      )
    )
  }

  sections.push(
    buildTargetAvailabilitySection(
      explanations,
      targetAction,
      landCoversForParcel,
      landCoverToString,
      designationZones
    ),
    buildResultSection(targetAction, availableAreaSqm, totalValidLandCoverSqm)
  )

  if (explanations.stacks.length > 0) {
    sections.push(
      buildStacksSection(
        explanations,
        landCoversForParcel,
        landCoverToString,
        designationZones
      )
    )
  }

  return sections
}
