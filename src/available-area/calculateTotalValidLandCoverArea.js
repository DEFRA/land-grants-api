import { sqmToHaRounded } from '../api/common/helpers/measurement.js'
import { aacExplain, createExplanationSection } from './explanations.js'

/**
 * Explanation message generators for total valid land cover operations
 */
const explain = {
  /**
   * Generates explanation when adding an action
   * @param {string} landCoverClassCode - Land Cover class code being added
   * @param {number} areaSqm - Area in sqm of the land class code
   * @param {CodeToString} landCoverToString
   * @returns {string} Explanation message
   */
  addCommonLandCover: (landCoverToString, landCoverClassCode, areaSqm) => {
    return aacExplain.landCoverClassCodeInfoAndArea(
      landCoverClassCode,
      areaSqm,
      landCoverToString
    )
  },
  totalResult: (areaSqm) => `= ${sqmToHaRounded(areaSqm)} ha`
}

/**
 * Calculates total valid land cover area, based on an array of LandCovers and a list of allowed codes
 * @param {LandCover[]} landCovers
 * @param {string[]} allowedCodes
 * @param {CodeToString} landCoverToString
 * @returns {{result: number, explanations: ExplanationSection }}
 */
export const calculateTotalValidLandCoverArea = (
  landCovers,
  allowedCodes,
  landCoverToString
) => {
  const explanations = []
  const result = landCovers.reduce((total, cover) => {
    if (allowedCodes.includes(cover.landCoverClassCode)) {
      explanations.push(
        explain.addCommonLandCover(
          landCoverToString,
          cover.landCoverClassCode,
          cover.areaSqm
        )
      )
      return total + cover.areaSqm
    } else {
      return total
    }
  }, 0)

  explanations.push(explain.totalResult(result))

  return {
    result,
    explanations: createExplanationSection(
      `Total valid land covers`,
      explanations
    )
  }
}

/**
 * @import { ExplanationSection } from './explanations.d.js'
 * @import { LandCover } from '../api/parcel/parcel.d.js'
 * @import { CodeToString } from './available-area.d.js'
 */
