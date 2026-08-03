/**
 * Converts a GBP amount to pence, rounding to the nearest integer.
 * @param {number} gbp
 * @returns {number}
 */
export const gbpToPence = (gbp = 0) => Math.round(gbp * 100)
