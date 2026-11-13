import { SINGLE_SIDE } from '~/src/features/common/constants/sidedness.js'
import { COMPATIBLE, DEDUCTED, STACKED } from './occupancyStatus.js'

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
 * @param {string[]} codes - Action codes
 * @returns {string} The codes as a list, the last joined with "and"
 */
const listOf = (codes) =>
  codes.length > 1
    ? `${codes.slice(0, -1).join(', ')} and ${codes.at(-1)}`
    : codes.join('')

/**
 * @param {ExplainedOccupancy} explainedOccupancy - An existing action and why it was or was not deducted
 * @param {string} targetAction - The action code being applied for
 * @returns {string} Why the action was or was not deducted from the boundary
 */
const feasibleReason = ({ status, sharesWith }, targetAction) => {
  if (status === COMPATIBLE) {
    return `Can share with ${targetAction}, so it is not deducted`
  }

  if (status === DEDUCTED) {
    return `Cannot share with ${targetAction}, so it is deducted`
  }

  if (sharesWith.length === 0) {
    return `Cannot share with ${targetAction}, but occupies no boundary to deduct`
  }

  const verb = sharesWith.length > 1 ? 'are' : 'is'

  return `Cannot share with ${targetAction}, but shares a stretch with ${listOf(sharesWith)}, which ${verb} already deducted`
}

/**
 * @param {ExplainedOccupancy} explainedOccupancy - An existing action and why it was or was not counted
 * @returns {string} Why the action was or was not counted in the boundary the existing actions need
 */
const infeasibleReason = ({ status, sharesWith }) => {
  if (status === DEDUCTED) {
    return 'Counted in the boundary the existing actions need'
  }

  if (sharesWith.length === 0) {
    return 'Occupies no boundary, so it is not counted'
  }

  return `Shares a stretch with ${listOf(sharesWith)}, so it is not counted again`
}

/**
 * @param {ExplainedOccupancy} explainedOccupancy - The boundary an existing action occupies, and why it was or was not deducted
 * @param {{targetAction: string, feasible: boolean}} context - The action applied for, and whether the existing actions all fit
 * @returns {string} The existing action, the boundary it occupies and why it was or was not deducted
 */
const occupancyLine = (explainedOccupancy, { targetAction, feasible }) => {
  const { actionCode, billedLengthMeters, sidedness, occupiedMeters } =
    explainedOccupancy

  const reason = feasible
    ? feasibleReason(explainedOccupancy, targetAction)
    : infeasibleReason(explainedOccupancy)

  return `${actionCode}: billed ${billedLengthMeters} m, ${sidedness}, occupies ${occupiedMeters} m of boundary. ${reason}`
}

/**
 * @param {ExplainedOccupancy[]} explainedOccupancies - The boundary each existing action occupies, and why it was or was not deducted
 * @param {{targetAction: string, feasible: boolean}} context - The action applied for, and whether the existing actions all fit
 * @returns {ExplanationSection} Each existing action on the boundary
 */
const existingActionsSection = (explainedOccupancies, context) => {
  const content =
    explainedOccupancies.length > 0
      ? explainedOccupancies.map((explainedOccupancy) =>
          occupancyLine(explainedOccupancy, context)
        )
      : ['No existing actions on the boundary']

  return { title: 'Existing actions on the boundary', content }
}

/**
 * @param {ExplainedOccupancy[]} explainedOccupancies - Each existing action and why it was or was not deducted
 * @returns {ExplainedOccupancy[]} The actions laid end to end, in the order given
 */
const deductedOf = (explainedOccupancies) =>
  explainedOccupancies.filter(({ status }) => status === DEDUCTED)

/**
 * Places each stacked action on the first deducted action it can share with
 * and fits within, or, when it fits within none alone, across every deducted
 * action it can share with.
 * @param {ExplainedOccupancy} stacked - An action stacked on deducted actions
 * @param {ExplainedOccupancy[]} deducted - The actions laid end to end
 * @returns {ExplainedOccupancy[]} The deducted actions it is placed on
 */
const placementOf = (stacked, deducted) => {
  const sharing = deducted.filter(({ actionCode }) =>
    stacked.sharesWith.includes(actionCode)
  )

  const fit = sharing.find(
    ({ occupiedMeters }) => occupiedMeters >= stacked.occupiedMeters
  )

  return fit ? [fit] : sharing
}

/**
 * @param {ExplainedOccupancy[]} explainedOccupancies - Each existing action and why it was or was not deducted
 * @returns {ExplanationSection | null} Each deducted action with the actions stacked on it, or nothing when none were deducted
 */
const stacksSection = (explainedOccupancies) => {
  const deducted = deductedOf(explainedOccupancies)

  if (deducted.length === 0) {
    return null
  }

  const stacked = explainedOccupancies.filter(
    ({ status }) => status === STACKED
  )

  const content = deducted.map((base, index) => {
    const codes = [
      base.actionCode,
      ...stacked
        .filter((action) => placementOf(action, deducted).includes(base))
        .map(({ actionCode }) => actionCode)
    ]

    return `Stack ${index + 1}: ${codes.join(' + ')} (${base.occupiedMeters} m)`
  })

  if (deducted.length > 1) {
    const bases = listOf(deducted.map(({ actionCode }) => actionCode))

    content.push(`${bases} cannot share a stretch with each other`)
  }

  return { title: 'Stacks', content }
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
export const doNotFitSection = ({
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
  {
    availableLength,
    boundaryLengthMeters,
    incompatibleLengthMeters,
    explainedOccupancies
  },
  { targetAction, targetSidedness }
) => {
  const freeBoundaryMeters = boundaryLengthMeters - incompatibleLengthMeters
  const bothFacesBilled = targetSidedness === SINGLE_SIDE

  const deducted = deductedOf(explainedOccupancies)
  const workings =
    deducted.length > 1
      ? `${deducted.map(({ occupiedMeters }) => occupiedMeters).join(' + ')} = `
      : ''

  const content = [
    `Boundary occupied by incompatible actions: ${workings}${incompatibleLengthMeters} m`,
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
 * applied for, the parcel boundary, the existing actions on it and why each
 * was or was not deducted, how they stack, and the result.
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
  const { explainedOccupancies, feasible } = availableLength
  const stacks = stacksSection(explainedOccupancies)

  const contextSections = [
    applicationSection(targetAction, targetSidedness),
    parcelBoundarySection(availableLength.boundaryLengthMeters),
    existingActionsSection(explainedOccupancies, { targetAction, feasible }),
    ...(stacks ? [stacks] : [])
  ]

  if (!feasible) {
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
