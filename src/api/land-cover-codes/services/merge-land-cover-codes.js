/**
 * @import {LandCovers} from '~/src/api/land-cover-codes/land-cover-codes.d.js'
 */

/**
 * Merges land cover codes into a single array of unique land cover and land cover class codes.
 * @param {LandCovers[]} landCoverCodes - Array of land cover codes with class codes.
 * @returns {string[]} Merged array of unique land cover class codes.
 */
export function mergeLandCoverCodes(landCoverCodes) {
  if (!landCoverCodes || !Array.isArray(landCoverCodes)) {
    throw new Error(
      'No land cover codes passed to mergeLandCoverCodes function'
    )
  }

  const mergedCodes = new Set()

  for (const { landCoverCode, landCoverClassCode } of landCoverCodes) {
    mergedCodes.add(landCoverClassCode)
    mergedCodes.add(landCoverCode)
  }

  return Array.from(mergedCodes).sort()
}
