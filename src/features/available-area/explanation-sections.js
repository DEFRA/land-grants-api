/**
 * @import { AacExplanations, DesignationOverlap, DesignationZone, ActionWithArea, CodeToString } from './available-area.d.js'
 * @import { ExplanationSection } from './explanations.d.js'
 * @import { LandCover } from '~/src/features/parcel/parcel.d.js'
 */

import { sqmToHaRounded } from '~/src/features/common/helpers/measurement.js'
import { stripTargetSuffix } from './explanation-derivation.js'

const ZONE_LABELS = {
  neither: 'no designation',
  sssi_only: 'SSSI only',
  hf_only: 'HF only',
  sssi_and_hf: 'SSSI and HF'
}

/**
 * Formats a land cover name with an optional designation zone label.
 * @param {string} lcName - The land cover display name
 * @param {DesignationZone} [zone] - The designation zone, if any
 * @returns {string}
 */
function formatLcWithZone(lcName, zone) {
  if (!zone || zone === 'neither') {
    return lcName
  }
  return `${lcName} [${ZONE_LABELS[zone]}]`
}

/**
 * Builds the Application section listing the target action code.
 * @param {string} targetAction
 * @returns {ExplanationSection}
 */
export function buildApplicationSection(targetAction) {
  return { title: 'Application', content: [`Target action: ${targetAction}`] }
}

/**
 * Builds the land covers on the parcel section.
 * @param {LandCover[]} landCovers
 * @param {CodeToString} landCoverToString
 * @returns {ExplanationSection}
 */
export function buildLandCoversOnParcelSection(landCovers, landCoverToString) {
  const content = landCovers.map(
    (lc) =>
      `${landCoverToString(lc.landCoverClassCode)}: ${sqmToHaRounded(lc.areaSqm)} ha`
  )
  return { title: 'Land covers on the parcel', content }
}

/**
 * Builds a section showing the SSSI and HF designation areas per land cover.
 * @param {LandCover[]} originalLandCovers
 * @param {CodeToString} landCoverToString
 * @param {DesignationOverlap[]} [sssiOverlap]
 * @param {DesignationOverlap[]} [hfOverlap]
 * @param {DesignationOverlap[]} [sssiAndHfOverlap]
 * @returns {ExplanationSection}
 */
export function buildDesignationAreasSection(
  originalLandCovers,
  landCoverToString,
  sssiOverlap,
  hfOverlap,
  sssiAndHfOverlap
) {
  const content = []
  for (let i = 0; i < originalLandCovers.length; i++) {
    const lcName = landCoverToString(originalLandCovers[i].landCoverClassCode)
    const sssi = sssiOverlap?.[i]?.areaSqm ?? 0
    const hf = hfOverlap?.[i]?.areaSqm ?? 0
    const both = sssiAndHfOverlap?.[i]?.areaSqm ?? 0
    if (sssi > 0 || hf > 0) {
      const parts = []
      parts.push(`${sqmToHaRounded(sssi)} ha SSSI`)
      parts.push(`${sqmToHaRounded(hf)} ha HF`)
      if (both > 0) {
        parts.push(`${sqmToHaRounded(both)} ha SSSI and HF overlap`)
      }
      content.push(`${lcName}: ${parts.join(', ')}`)
    }
  }
  if (content.length === 0) {
    content.push('No SSSI or HF designations on this parcel')
  }
  return { title: 'Designation areas', content }
}

/**
 * Builds a section showing the SSSI/HF eligibility of each action.
 * @param {string} targetLabel
 * @param {ActionWithArea[]} existingActions
 * @param {{[actionCode: string]: boolean}} [sssiActionEligibility]
 * @param {{[actionCode: string]: boolean}} [hfActionEligibility]
 * @returns {ExplanationSection}
 */
export function buildDesignationEligibilitySection(
  targetLabel,
  existingActions,
  sssiActionEligibility,
  hfActionEligibility
) {
  const targetRealCode = stripTargetSuffix(targetLabel)

  const allCodes = [targetRealCode, ...existingActions.map((a) => a.actionCode)]

  const content = allCodes.map((code) => {
    const sssi =
      sssiActionEligibility?.[code] !== false
        ? 'SSSI eligible'
        : 'SSSI ineligible'
    const hf =
      hfActionEligibility?.[code] !== false ? 'HF eligible' : 'HF ineligible'
    return `${code}: ${sssi}, ${hf}`
  })

  return { title: 'Designation eligibility per action', content }
}

/**
 * @param {AacExplanations} explanations
 * @param {CodeToString} landCoverToString
 * @param {DesignationZone[]} [designationZones]
 * @returns {ExplanationSection}
 */
export function buildEligibilitySection(
  explanations,
  landCoverToString,
  designationZones
) {
  const content = []

  for (const [actionCode, entries] of Object.entries(
    explanations.eligibility
  )) {
    if (entries.length === 0) {
      content.push(`${actionCode}: no eligible land covers on this parcel`)
    } else {
      const landCoverList = entries
        .map((e) => {
          const lcName = landCoverToString(e.landCoverClassCode)
          const zone = designationZones?.[e.landCoverIndex]
          const display = formatLcWithZone(lcName, zone)
          return display
        })
        .join(', ')
      content.push(`${actionCode}: ${landCoverList}`)
    }
  }

  return {
    title: designationZones
      ? 'Eligible land covers per action (with designation zones)'
      : 'Eligible land covers per action',
    content
  }
}

/**
 * @param {AacExplanations} explanations
 * @returns {ExplanationSection}
 */
export function buildAdjustedActionsSection(explanations) {
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
export function buildIncompatibilitySection(explanations) {
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
 * @param {DesignationZone[]} [designationZones]
 * @returns {ExplanationSection}
 */
export function buildAllocationsSection(
  explanations,
  landCoversForParcel,
  landCoverToString,
  designationZones
) {
  /** @type {Map<string, {actionCode: string, landCoverIndex: number, areaSqm: number}[]>} */
  const byAction = new Map()
  for (const alloc of explanations.allocations) {
    if (!byAction.has(alloc.actionCode)) {
      byAction.set(alloc.actionCode, [])
    }
    const actionAllocs = /** @type {typeof explanations.allocations} */ (
      byAction.get(alloc.actionCode)
    )
    actionAllocs.push(alloc)
  }

  const content = []
  for (const [actionCode, allocs] of byAction) {
    const parts = allocs.map((a) => {
      const lc = landCoversForParcel[a.landCoverIndex]
      const lcName = landCoverToString(lc.landCoverClassCode)
      const zone = designationZones?.[a.landCoverIndex]
      return `${sqmToHaRounded(a.areaSqm)} ha on ${formatLcWithZone(lcName, zone)}`
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
 * @param {DesignationZone[]} [designationZones]
 * @returns {ExplanationSection}
 */
export function buildTargetAvailabilitySection(
  explanations,
  targetAction,
  landCoversForParcel,
  landCoverToString,
  designationZones
) {
  const content = explanations.targetAvailability.map((ta) => {
    const lc = landCoversForParcel[ta.landCoverIndex]
    const lcName = landCoverToString(lc.landCoverClassCode)
    const zone = designationZones?.[ta.landCoverIndex]
    const display = formatLcWithZone(lcName, zone)
    return `${display}: ${sqmToHaRounded(ta.totalAreaSqm)} ha total, ${sqmToHaRounded(ta.usedByExistingSqm)} ha used by existing actions, ${sqmToHaRounded(ta.availableSqm)} ha available`
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
export function buildResultSection(
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
 * @param {DesignationZone[]} [designationZones]
 * @returns {ExplanationSection}
 */
export function buildStacksSection(
  explanations,
  landCoversForParcel,
  landCoverToString,
  designationZones
) {
  const content = explanations.stacks.map((stack) => {
    let display = 'Land cover unknown'
    if (stack.landCoverIndex !== undefined) {
      const lc = landCoversForParcel[stack.landCoverIndex]
      const lcName = landCoverToString(lc.landCoverClassCode)
      const zone = designationZones?.[stack.landCoverIndex]
      display = formatLcWithZone(lcName, zone)
    }
    return `Stack ${stack.stackNumber}: ${stack.actionCodes.join(' + ')} on ${display} (${sqmToHaRounded(stack.areaSqm)} ha)`
  })

  return {
    title: 'Stacks',
    content
  }
}
