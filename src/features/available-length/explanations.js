import { SINGLE_SIDE } from '~/src/features/common/constants/sidedness.js'

/**
 * @param {string} targetAction - The action code being applied for
 * @param {Sidedness} targetSidedness - The sidedness of the action applied for
 * @returns {ExplanationSection} The action applied for and its sidedness
 */
const applicationSection = (targetAction, targetSidedness) => ({
  title: 'Application',
  content: [`Target action: ${targetAction}`, `Sidedness: ${targetSidedness}`]
})

/**
 * @param {number} boundaryLengthMeters - The parcel's perimeter
 * @returns {ExplanationSection} The parcel's perimeter
 */
const parcelBoundarySection = (boundaryLengthMeters) => ({
  title: 'Parcel boundary',
  content: [`Parcel boundary: ${boundaryLengthMeters} m`]
})

/**
 * @param {ExplainedOccupancy} explainedOccupancy - The boundary an existing action occupies, and whether it was deducted
 * @returns {string} The existing action, the boundary it occupies and whether it was deducted
 */
const occupancyLine = ({
  actionCode,
  billedLengthMeters,
  sidedness,
  occupiedMeters,
  deducted
}) => {
  const deduction = deducted ? 'deducted' : 'not deducted'

  return `${actionCode}: billed ${billedLengthMeters} m, ${sidedness}, occupies ${occupiedMeters} m of boundary, ${deduction}`
}

/**
 * @param {ExplainedOccupancy[]} explainedOccupancies - The boundary each existing action occupies, and whether it was deducted
 * @returns {ExplanationSection} Each existing action on the boundary
 */
const existingActionsSection = (explainedOccupancies) => {
  const content =
    explainedOccupancies.length > 0
      ? explainedOccupancies.map(occupancyLine)
      : ['No existing actions on the boundary']

  return { title: 'Existing actions on the boundary', content }
}

/**
 * @param {string} targetAction - The action code being applied for
 * @param {number} availableLength - The length still claimable
 * @returns {string} The length still claimable for the action applied for
 */
const maximumLine = (targetAction, availableLength) =>
  `Maximum available length for ${targetAction}: ${availableLength} m`

/**
 * @param {AvailableLength} availableLength - The available length and the figures behind it
 * @returns {ExplanationSection} Why nothing is available when the existing actions cannot all fit
 */
const doNotFitSection = ({
  incompatibleLengthMeters,
  boundaryLengthMeters
}) => ({
  title: 'Error - existing actions do not fit',
  content: [
    `The existing actions need ${incompatibleLengthMeters} m of boundary however they are arranged, but the parcel boundary is only ${boundaryLengthMeters} m. This requires a manual review and existing agreements may need adjusting.`
  ]
})

/**
 * @param {AvailableLength} availableLength - The available length and the figures behind it
 * @param {{targetAction: string, targetSidedness: Sidedness}} target - The action applied for and its sidedness
 * @returns {ExplanationSection} How the free boundary becomes the available length
 */
const resultSection = (
  { availableLength, boundaryLengthMeters, incompatibleLengthMeters },
  { targetAction, targetSidedness }
) => {
  const freeBoundaryMeters = boundaryLengthMeters - incompatibleLengthMeters
  const bothFacesBilled = targetSidedness === SINGLE_SIDE

  const content = [
    `Boundary occupied by incompatible actions: ${incompatibleLengthMeters} m`,
    `Free boundary: ${freeBoundaryMeters} m`
  ]

  if (bothFacesBilled) {
    content.push(
      `${targetAction} is single-side, so both faces of the free boundary can be billed`
    )
  }

  content.push(maximumLine(targetAction, availableLength))

  return { title: 'Result', content }
}

/**
 * @param {AvailableLength} availableLength - The available length and the figures behind it
 * @param {string} targetAction - The action code being applied for
 * @returns {ExplanationSection} The result when the existing actions cannot all fit
 */
const unavailableResultSection = ({ availableLength }, targetAction) => ({
  title: 'Result',
  content: [maximumLine(targetAction, availableLength)]
})

/**
 * Explains a linear action's available length step by step: the action
 * applied for, the parcel boundary, the existing actions on it and the result.
 * @param {AvailableLength} availableLength - The available length and the figures behind it
 * @param {object} target
 * @param {string} target.targetAction - The action code being applied for
 * @param {Sidedness} target.targetSidedness - The sidedness of the action applied for
 * @returns {ExplanationSection[]} The explanation, one section per step
 */
export function formatLengthExplanationSections(
  availableLength,
  { targetAction, targetSidedness }
) {
  const contextSections = [
    applicationSection(targetAction, targetSidedness),
    parcelBoundarySection(availableLength.boundaryLengthMeters),
    existingActionsSection(availableLength.explainedOccupancies)
  ]

  if (!availableLength.feasible) {
    return [
      ...contextSections,
      doNotFitSection(availableLength),
      unavailableResultSection(availableLength, targetAction)
    ]
  }

  return [
    ...contextSections,
    resultSection(availableLength, { targetAction, targetSidedness })
  ]
}

/**
 * @import { AvailableLength, ExplainedOccupancy, Sidedness } from '~/src/features/available-length/available-length.d.js'
 * @import { ExplanationSection } from '~/src/features/available-area/explanations.d.js'
 */
