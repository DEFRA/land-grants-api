import {
  BOTH_SIDES,
  SINGLE_SIDE
} from '~/src/features/common/constants/sidedness.js'

export const PARCEL_PERIMETER_METERS = 1000

// The linear actions as configured: BND2, CHRW2 and WBD2 stack with each
// other; BND1 stacks with nothing; no action stacks with itself
/** @type {SidednessByActionCode} */
export const LINEAR_SIDEDNESS = {
  BND1: BOTH_SIDES,
  BND2: SINGLE_SIDE,
  CHRW2: SINGLE_SIDE,
  WBD2: BOTH_SIDES
}

const STACKING_CODES = new Set(['BND2', 'CHRW2', 'WBD2'])

/**
 * @param {string} code - One action's code
 * @param {string} otherCode - The other action's code
 * @returns {boolean} Whether the two linear actions can share a stretch of boundary, as configured
 */
export const linearCompatibility = (code, otherCode) =>
  code !== otherCode &&
  STACKING_CODES.has(code) &&
  STACKING_CODES.has(otherCode)

/**
 * @param {...string[]} pairs - The pairs of action codes that can share a stretch
 * @returns {CompatibilityCheckFn} Compatible only where a pair is listed, in either order
 */
export const compatibleOnly =
  (...pairs) =>
  (code, otherCode) =>
    pairs.some(
      ([first, second]) =>
        (first === code && second === otherCode) ||
        (first === otherCode && second === code)
    )

/**
 * @param {Partial<BoundaryContext>} [overrides] - Anything that differs from the default parcel
 * @returns {BoundaryContext} A parcel with a 1000 m perimeter and the linear actions as configured
 */
export const parcel = (overrides = {}) => ({
  compatibilityCheckFn: linearCompatibility,
  boundaryLengthMeters: PARCEL_PERIMETER_METERS,
  sidednessByActionCode: LINEAR_SIDEDNESS,
  ...overrides
})

/**
 * @param {string} actionCode - The existing action's code
 * @param {number} billedLengthMeters - The length billed for it, in metres
 * @returns {ActionWithLength} An action already on the boundary
 */
export const existing = (actionCode, billedLengthMeters) => ({
  actionCode,
  billedLengthMeters
})

/**
 * @import { CompatibilityCheckFn } from '~/src/features/available-area/available-area.d.js'
 * @import { ActionWithLength, BoundaryContext, SidednessByActionCode } from '~/src/features/available-length/available-length.d.js'
 */
