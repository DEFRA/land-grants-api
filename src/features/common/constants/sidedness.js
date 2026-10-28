export const SINGLE_SIDE = 'single-side'
export const BOTH_SIDES = 'both-sides'

// A single-side action is paid per face, and a boundary has two
const SINGLE_SIDE_BILLING_FACTOR = 2
const BOTH_SIDES_BILLING_FACTOR = 1

/**
 * Billed metres per metre of physical boundary.
 * @param {Sidedness} [sidedness] - The action's sidedness, both-sides when absent
 * @returns {number} The billing factor
 */
export function billingFactorOf(sidedness) {
  return sidedness === SINGLE_SIDE
    ? SINGLE_SIDE_BILLING_FACTOR
    : BOTH_SIDES_BILLING_FACTOR
}

/**
 * @import { Sidedness } from '~/src/features/available-length/available-length.d.js'
 */
