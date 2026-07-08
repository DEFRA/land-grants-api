/**
 * Sums the area of all parcels to produce the total land area.
 * @param {Array<LandParcelDb | null>} parcels - The land parcels
 * @returns {number} The total land area in square metres
 */
export const sumTotalLandAreaSqm = (parcels) => {
  return parcels.reduce((acc, parcel) => acc + (parcel?.area ?? 0), 0)
}

/**
 * @import { LandParcelDb } from '~/src/features/parcel/parcel.d.js'
 */
