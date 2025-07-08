/**
 * @typedef {object} Stack
 * @property {number} stackNumber - The unique identifier for the stack
 * @property {string[]} actionCodes - The action codes associated with the stack
 * @property {number} quantity - The area of the stack in square meters
 */

/**
 * @typedef {object} Action
 * @property {string} code - The unique identifier for the action
 * @property {number} quantity - The area of the action in square meters
 */

/**
 * @typedef {Function} CompatibilityCheckFn
 * @param {string} code1 - The first action code to check
 * @param {string} code2 - The second action code to check
 * @returns {boolean} true if the two action codes are compatible, false otherwise
 */
