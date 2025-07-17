import { sqmToHaRounded } from '../api/common/helpers/measurement.js'
import { aacExplain, createExplanationSection } from './explanations.js'

/**
 * Explanation message generators for total valid land cover operations
 */
const explain = {
  /**
   * Generates explanation when adding an action
   * @param {{[key:string]: LandCoverDefinition }} landCoverDefinitions - The land cover definitions
   * @param {string} landCoverClassCode - Land Cover class code being added
   * @param {number} areaSqm - Area in sqm of the land class code
   * @returns {string} Explanation message
   */
  addCommonLandCover: (landCoverDefinitions, landCoverClassCode, areaSqm) => {
    return aacExplain.landCoverClassCodeInfoAndArea(
      landCoverClassCode,
      areaSqm,
      landCoverDefinitions
    )
  },
  totalResult: (areaSqm) => `= ${sqmToHaRounded(areaSqm)} ha`
}

/**
 * Calculates total valid land cover area, based on an array of LandCovers and a list of allowed codes
 * @param {LandCover[]} landCovers
 * @param {string[]} allowedCodes
 * @param {{[key:string]: LandCoverDefinition }} landCoverDefinitions - The land cover definitions
 * @returns {{result: number, explanations: ExplanationSection }}
 */
export const calculateTotalValidLandCoverArea = (
  landCovers,
  allowedCodes,
  landCoverDefinitions
) => {
  const explanations = []
  const result = landCovers.reduce((total, cover) => {
    if (allowedCodes.includes(cover.landCoverClassCode)) {
      explanations.push(
        explain.addCommonLandCover(
          landCoverDefinitions,
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
 * @import { LandCoverDefinition } from '../api/land-cover-codes/land-cover-codes.d.js'
 * @import { LandCover } from '../api/parcel/parcel.d.js'
 */
