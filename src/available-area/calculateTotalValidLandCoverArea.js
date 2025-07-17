import { createExplanationSection } from './explanations.js'

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
  const explanationsContent = []
  const result = landCovers.reduce((total, cover) => {
    if (allowedCodes.includes(cover.landCoverClassCode)) {
      let description = ''
      const definition = landCoverDefinitions[cover.landCoverClassCode]

      if (!definition) {
        description = `${cover.landCoverClassCode}`
      } else {
        description = `${definition.landCoverClassDescription} (${cover.landCoverClassCode})`
      }
      explanationsContent.push(`${description} - ${cover.areaSqm} sqm`)
      return total + cover.areaSqm
    } else {
      return total
    }
  }, 0)

  explanationsContent.push(`= ${result} sqm`)

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
 * @import { LandCoverDefinition } from '../api/land-cover-codes/land-cover-codes.d.js'
 * @import { LandCover } from '../api/parcel/parcel.d.js'
 */
