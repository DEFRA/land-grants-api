/**
 * @typedef {object} AvailableLength
 * @property {number} availableLength - The length still claimable, in the applied-for action's billed metres. Never negative: a boundary committed beyond its own length reports zero, as does one whose geometry could not be read
 * @property {number} boundaryLengthMeters - The parcel's own perimeter, or zero when its geometry could not be read
 * @property {number} incompatibleLengthMeters - The physical boundary already occupied by actions incompatible with the one applied for, or that all the existing actions need when they cannot fit
 * @property {ActionWithLength[]} incompatibleActions - The actions taking up that length, which can leave out an action sharing its stretch with one listed
 * @property {boolean} feasible - Whether the existing actions can all fit the boundary, however they are arranged
 * @property {ExplainedOccupancy[]} explainedOccupancies - The boundary each existing action occupies, in the order given
 */

/**
 * @typedef {object} Occupancy
 * @property {string} actionCode - The action's code
 * @property {number} billedLengthMeters - The length billed for this action, in metres
 * @property {Sidedness} sidedness - The action's sidedness, both-sides when it has none
 * @property {number} occupiedMeters - The physical boundary it occupies, in whole metres
 */

/**
 * @typedef {Occupancy & {deducted: boolean}} ExplainedOccupancy
 * The boundary an existing action occupies, and whether it was deducted
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
