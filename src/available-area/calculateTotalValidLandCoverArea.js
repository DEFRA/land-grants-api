/**
 * Calculates total valid land cover area, based on an array of LandCovers and a list of allowed codes
 * @param {LandCover[]} landCovers
 * @param {string[]} allowedCodes
 * @returns {number}
 */
export const calculateTotalValidLandCoverArea = (landCovers, allowedCodes) =>
  landCovers.reduce(
    (total, cover) =>
      allowedCodes.includes(cover.landCoverClassCode)
        ? total + cover.areaSqm
        : total,
    0
  )

/**
 * @import { Action, CompatibilityCheckFn, AvailableAreaDataRequirements} from './available-area.d.js'
 * @import { LandCover } from '../api/parcel/parcel.d.js'
 */
