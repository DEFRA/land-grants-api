import { sqmToHaRounded } from '../api/common/helpers/measurement.js'

/**
 * @import { ExplanationSection } from './explanations.d.js'
 * @import { CodeToString, Action } from './available-area.d.js'
 * @import { LandCover } from '../api/parcel/parcel.d.js'
 * @import { LandCoverCodes } from '../api/land-cover-codes/land-cover-codes.d.js'
 */

export const aacExplain = {
  /**
   * Generates explanation when adding an action
   * @param {string} landCoverClassCode - Land Cover class code being added
   * @param {number} areaSqm - Area in sqm of the land class code
   * @param {CodeToString} landCoverToString - The land cover definitions
   * @returns {string} Explanation message
   */
  landCoverClassCodeInfoAndArea: (
    landCoverClassCode,
    areaSqm,
    landCoverToString
  ) =>
    `${landCoverToString(landCoverClassCode)} - ${sqmToHaRounded(areaSqm)} ha`
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
    buildContent: ({ landCoversForParcel, landCoverToString }) =>
      landCoversForParcel.map((cover) =>
        aacExplain.landCoverClassCodeInfoAndArea(
          cover.landCoverClassCode,
          cover.areaSqm,
          landCoverToString
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
    buildContent: ({ landCoverCodesForAppliedForAction, landCoverToString }) =>
      landCoverCodesForAppliedForAction.map(
        (code) =>
          `${landCoverToString(code.landCoverClassCode, true)} - ${landCoverToString(code.landCoverCode)}`
      )
  }
]

/**
 * Generates the initial explanations for the available area calculation.
 * @param {string} actionCodeAppliedFor - The action code being applied for
 * @param {string} sheetId - The sheet ID of the parcel
 * @param {string} parcelId - The parcel ID
 * @param {LandCover[]} landCoversForParcel - The land covers for the parcel
 * @param {Action[]} existingActions - The list of existing actions
 * @param {string[]} landCoverCodesForAppliedForAction - The land cover codes for the action being applied for
 * @param {CodeToString} landCoverToString
 * @returns {ExplanationSection[]} - The initial explanations
 */
export function getInitialExplanations(
  actionCodeAppliedFor,
  sheetId,
  parcelId,
  landCoversForParcel,
  existingActions,
  landCoverCodesForAppliedForAction,
  landCoverToString
) {
  const data = {
    actionCodeAppliedFor,
    sheetId,
    parcelId,
    landCoversForParcel,
    existingActions,
    landCoverCodesForAppliedForAction,
    landCoverToString
  }

  return initialExplanationSections.map((section) => {
    const title =
      typeof section.title === 'function' ? section.title(data) : section.title
    const content = section.buildContent(data)
    return createExplanationSection(title, content)
  })
}
