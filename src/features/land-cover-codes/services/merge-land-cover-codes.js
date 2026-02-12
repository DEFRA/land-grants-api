/**
 * Merges land cover codes into a single array of unique land cover and land cover class codes.
 * @param {LandCoverCodes[]} landCoverCodes - Array of land cover codes with class codes.
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
  for (const { landCoverCode, landCoverClassCode } of landCoverCodes) {
    mergedCodes.add(landCoverCode)
    mergedCodes.add(landCoverClassCode)
  }

  return Array.from(mergedCodes).sort((a, b) => a.localeCompare(b))
}

/**
 * @import {LandCoverCodes} from '~/src/features/land-cover-codes/land-cover-codes.d.js'
 */
