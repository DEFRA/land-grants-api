/**
 * @typedef {object} AvailableLength
 * @property {number} availableLength - The boundary length still claimable, in whole metres. Never negative: a boundary committed beyond its own length reports zero, as does one whose geometry could not be read
 * @property {number} boundaryLengthMeters - The parcel's own perimeter, or zero when its geometry could not be read
 * @property {number} incompatibleLengthMeters - The length already committed to actions incompatible with the one applied for
 */

/**
 * @typedef {object} ActionWithLength
 * @property {string} actionCode - The action's code
 * @property {number} boundaryLengthMeters - The boundary length committed to this action, in metres
 */
