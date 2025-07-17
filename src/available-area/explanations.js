import { sqmToHaRounded } from '../api/common/helpers/measurement.js'

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
 * Configuration for explanation sections - easy to modify structure here
 */
const initialExplanationSections = [
  {
    title: 'Application Information',
    buildContent: ({ actionCodeAppliedFor, sheetId, parcelId }) => [
      `Action code - ${actionCodeAppliedFor}`,
      `Parcel Id - ${sheetId} ${parcelId}`
    ]
  },
  {
    title: 'Land Covers For Parcel',
    buildContent: ({ landCoversForParcel, landCoverDefinitions }) =>
      landCoversForParcel.map((cover) => {
        const landCoverDefinition =
          landCoverDefinitions[cover.landCoverClassCode]

        if (landCoverDefinition != null) {
          return `${landCoverDefinition.landCoverDescription} (${cover.landCoverClassCode}) - ${sqmToHaRounded(cover.areaSqm)} ha`
        }
        return `${cover.landCoverClassCode} - ${sqmToHaRounded(cover.areaSqm)} ha`
      })
  },
  {
    title: 'Existing actions',
    buildContent: ({ existingActions }) =>
      existingActions.map(
        (action) =>
          `${action.actionCode} - ${sqmToHaRounded(action.areaSqm)} ha`
      )
  },
  {
    title: ({ actionCodeAppliedFor }) =>
      `Valid land covers for action: ${actionCodeAppliedFor}`,
    buildContent: ({
      landCoverCodesForAppliedForAction,
      landCoverDefinitions
    }) =>
      landCoverCodesForAppliedForAction.map((code) => {
        const definition = landCoverDefinitions[code.landCoverCode]

        if (!definition) {
          return `${code.landCoverClassCode} - ${code.landCoverCode}`
        }

        return `${definition.landCoverClassDescription} (${code.landCoverClassCode}) - ${definition.landCoverDescription} (${code.landCoverCode})`
      })
  }
]

/**
 * Generates the initial explanations for the available area calculation.
 */
export function getInitialExplanations(
  actionCodeAppliedFor,
  sheetId,
  parcelId,
  landCoversForParcel,
  existingActions,
  landCoverCodesForAppliedForAction,
  landCoverDefinitions
) {
  const data = {
    actionCodeAppliedFor,
    sheetId,
    parcelId,
    landCoversForParcel,
    existingActions,
    landCoverCodesForAppliedForAction,
    landCoverDefinitions
  }

  return initialExplanationSections.map((section) => {
    const title =
      typeof section.title === 'function' ? section.title(data) : section.title
    const content = section.buildContent(data)
    return createExplanationSection(title, content)
  })
}

/**
 * @import { ExplanationSection } from './explanations.d.js'
 */
