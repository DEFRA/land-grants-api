import { createExplanationSection } from './explanations.js'

/**
 * Calculates total valid land cover area, based on an array of LandCovers and a list of allowed codes
 * @param {LandCover[]} landCovers
 * @param {string[]} allowedCodes
 * @returns {{result: number, explanations: ExplanationSection }}
 */
export const calculateTotalValidLandCoverArea = (landCovers, allowedCodes) => {
  const explanationsContent = []
  const result = landCovers.reduce((total, cover) => {
    if (allowedCodes.includes(cover.landCoverClassCode)) {
      explanationsContent.push(
        `${cover.landCoverClassCode} - ${cover.areaSqm} sqm`
      )
      return total + cover.areaSqm
    } else {
      return total
    }
  }, 0)
  explanationsContent.push(`Total = ${result} sqm`)

  return {
    result,
    explanations: createExplanationSection(
      `Total valid land covers`,
      explanationsContent
    )
  }
}

/**
 * @import { ExplanationSection } from './explanations.d.js'
 * @import { LandCover } from '../api/parcel/parcel.d.js'
 */
