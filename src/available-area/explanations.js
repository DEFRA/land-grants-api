import { sqmToHaRounded } from '../api/common/helpers/measurement.js'

export const aacExplain = {
  /**
   * Generates explanation when adding an action
   * @param {string} landCoverClassCode - Land Cover class code being added
   * @param {number} areaSqm - Area in sqm of the land class code
   * @param {{[key:string]: LandCoverDefinition }} landCoverDefinitions - The land cover definitions
   * @returns {string} Explanation message
   */
  landCoverClassCodeInfoAndArea: (
    landCoverClassCode,
    areaSqm,
    landCoverDefinitions
  ) => {
    const landCoverDefinition = landCoverDefinitions[landCoverClassCode]
    if (landCoverDefinition != null) {
      return `${landCoverDefinition.landCoverDescription} (${landCoverClassCode}) - ${sqmToHaRounded(areaSqm)} ha`
    }
    return `${landCoverClassCode} - ${sqmToHaRounded(areaSqm)} ha`
  }
}

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
      landCoversForParcel.map((cover) =>
        aacExplain.landCoverClassCodeInfoAndArea(
          cover.landCoverClassCode,
          cover.areaSqm,
          landCoverDefinitions
        )
      )
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
 * @import { LandCoverDefinition } from '../api/land-cover-codes/land-cover-codes.d.js'
 */
