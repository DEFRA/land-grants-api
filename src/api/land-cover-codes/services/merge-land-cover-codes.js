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

  // eslint-disable-next-line camelcase
  for (const { land_cover_code, land_cover_class_code } of landCoverCodes) {
    mergedCodes.add(land_cover_code)
    mergedCodes.add(land_cover_class_code)
  }

  return Array.from(mergedCodes).sort()
}
