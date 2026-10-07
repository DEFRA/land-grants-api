/**
 * @typedef {object} AvailableLength
 * @property {number} availableLength - The boundary length still claimable, in whole metres. Never negative: a boundary committed beyond its own length reports zero, as does one whose geometry could not be read
 * @property {number} boundaryLengthMeters - The parcel's own perimeter, or zero when its geometry could not be read
 * @property {number} incompatibleLengthMeters - The length already committed to actions incompatible with the one applied for
 * @property {ActionWithLength[]} incompatibleActions - The actions that length is committed to
 * @property {boolean} exceedsBoundary - Whether those actions claim more than the whole boundary, which no arrangement of them can satisfy
 */

/**
 * @typedef {object} ActionWithLength
 * @property {string} actionCode - The action's code
 * @property {number} billedLengthMeters - The length billed for this action, in metres, as recorded on an agreement or entered on an application
 */
