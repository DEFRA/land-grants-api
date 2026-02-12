/**
 * Transforms action land covers query response
 * @param {LandCoverDefinition[]} landCoverDefinitions - The land cover definitions
 * @returns {CodeToString} - A function that converts land cover codes to strings
 */
export function createLandCoverCodeToString(landCoverDefinitions) {
  /** @type {{[key:string]: LandCoverDefinition}} */
  const byLandCoverCode = {}
  /** @type {{[key:string]: LandCoverDefinition}} */
  const byLandCoverClassCode = {}

  for (const landCoverDefinition of landCoverDefinitions) {
    byLandCoverCode[landCoverDefinition.landCoverCode] = landCoverDefinition
    byLandCoverClassCode[landCoverDefinition.landCoverClassCode] =
      landCoverDefinition
  }

  return makeLandCoverToString(byLandCoverCode, byLandCoverClassCode)
}

/**
 *
 * @param {{[key:string]: LandCoverDefinition}} byLandCoverCode
 * @param {{[key:string]: LandCoverDefinition}} byLandCoverClassCode
 * @returns {(string) => string}
 */
function makeLandCoverToString(byLandCoverCode, byLandCoverClassCode) {
  return (landCoverCode, noWarning = false) => {
    const landCover = byLandCoverCode[landCoverCode]

    if (landCover != null) {
      return `${landCover.landCoverDescription} (${landCover.landCoverCode})`
    }

    const landCoverClass = byLandCoverClassCode[landCoverCode]

    if (landCoverClass != null) {
      return `${landCoverClass.landCoverClassDescription} (${landCoverClass.landCoverClassCode})${noWarning ? '' : ' Warning: This is a land cover class'}`
    }

    return `Unknown land cover code: ${landCoverCode}`
  }
}

/**
 * @import { LandCoverDefinition } from '../land-cover-codes.d.js'
 * @import { CodeToString } from '~/src/features/available-area/available-area.d.js'
 */
