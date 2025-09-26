/**
 * @import { ExplanationSection } from './explanations.d.js'
 * @import { LandCover } from '../api/parcel/parcel.d.js'
 * @import { LandCoverCodes } from '~/src/api/land-cover-codes/land-cover-codes.d.js'
 */

/**
 * @typedef {object} Stack
 * @property {number} stackNumber - The unique identifier for the stack
 * @property {string[]} actionCodes - The action codes associated with the stack
 * @property {number} areaSqm - The area of the stack in square meters
 */

/**
 * @typedef {object} Action
 * @property {string} actionCode - The action code
 * @property {number} areaSqm - The action area in sqm
 */

/**
 * @typedef {Function} CompatibilityCheckFn
 * @param {string} code1 - The first action code to check
 * @param {string} code2 - The second action code to check
 * @returns {boolean} true if the two action codes are compatible, false otherwise
 */

/**
 * @typedef {object} StackResponse
 * @property {Stack[]} stacks - The list of stacks created from the actions
 * @property {ExplanationSection} explanations
 */

/**
 * @typedef {(code:string, noWarning?: boolean) => string} CodeToString
 */

/**
 * @typedef {object} AvailableAreaDataRequirements
 * @property {LandCoverCodes[]} landCoverCodesForAppliedForAction - The land cover codes for the action being applied for
 * @property {LandCover[]} landCoversForParcel - The land covers for the parcel
 * @property {{[key: string]: LandCoverCodes[]}} landCoversForExistingActions
 * @property {CodeToString} landCoverToString - Function to get description of land cover or land cover class code
 */

/**
 * @typedef {object} ActionWithArea
 * @property {string} actionCode - The action code
 * @property {number} areaSqm - The action area
 */

/**
 * @typedef {object} StackResult
 * @property {number} availableAreaSqm - The available area
 * @property {number} availableAreaHectares - The available area
 * @property {ExplanationSection} stackExplanations - The explanation section
 * @property {ExplanationSection} resultExplanation - The explanation section
 * @property {Stack[]} stacks - The stacks
 */
