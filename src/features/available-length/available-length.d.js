/**
 * @typedef {object} AvailableLength
 * @property {number} availableLength - The length still claimable, in the applied-for action's billed metres. Never negative: a boundary committed beyond its own length reports zero, as does one whose geometry could not be read
 * @property {number} boundaryLengthMeters - The parcel's own perimeter, or zero when its geometry could not be read
 * @property {number} incompatibleLengthMeters - The physical boundary already occupied by actions incompatible with the one applied for
 * @property {ActionWithLength[]} incompatibleActions - The actions that length is committed to
 * @property {boolean} exceedsBoundary - Whether those actions claim more than the whole boundary, which no arrangement of them can satisfy
 */

/**
 * @typedef {'single-side'|'both-sides'} Sidedness
 */

/**
 * @typedef {{[actionCode: string]: Sidedness}} SidednessByActionCode
 */

/**
 * @typedef {object} BoundaryContext
 * @property {CompatibilityCheckFn} compatibilityCheckFn - Whether two actions can share a stretch of boundary
 * @property {number} boundaryLengthMeters - The parcel's perimeter in whole metres
 * @property {SidednessByActionCode} sidednessByActionCode - The sidedness of the codes involved; a code missing from it is both-sides
 */

/**
 * @import { CompatibilityCheckFn } from '~/src/features/available-area/available-area.d.js'
 */

/**
 * @typedef {object} ActionWithLength
 * @property {string} actionCode - The action's code
 * @property {number} billedLengthMeters - The length billed for this action, in metres, as recorded on an agreement or entered on an application
 */
