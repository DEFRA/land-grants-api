/**
 * @import { ExplanationSection } from './explanations.d.js'
 * @import { LandCover } from '~/src/features/parcel/parcel.d.js'
 * @import { LandCoverCodes } from '~/src/features/land-cover-codes/land-cover-codes.d.js'
 */

/**
 * @typedef {object} Stack
 * @property {number} stackNumber - The unique identifier for the stack
 * @property {string[]} actionCodes - The action codes associated with the stack
 * @property {number} areaSqm - The area of the stack in square meters
 * @property {number} [landCoverIndex] - Index into landCoversForParcel identifying which land cover this stack is on
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
 * @typedef {object} DesignationOverlap
 * @property {string} landCoverClassCode - The land cover class code this overlap relates to
 * @property {number} areaSqm - Area of a land cover that intersects this designation
 */

/**
 * @typedef {'neither' | 'sssi_only' | 'hf_only' | 'sssi_and_hf'} DesignationZone
 */

/**
 * @typedef {object} AvailableAreaDataRequirements
 * @property {LandCoverCodes[]} landCoverCodesForAppliedForAction - The land cover codes for the action being applied for
 * @property {LandCover[]} landCoversForParcel - The land covers for the parcel
 * @property {{[key: string]: LandCoverCodes[]}} landCoversForExistingActions
 * @property {CodeToString} landCoverToString - Function to get description of land cover or land cover class code
 * @property {DesignationOverlap[]} [sssiOverlap] - Per land cover: area intersecting SSSI (parallel to landCoversForParcel)
 * @property {DesignationOverlap[]} [hfOverlap] - Per land cover: area intersecting HF (parallel to landCoversForParcel)
 * @property {DesignationOverlap[]} [sssiAndHfOverlap] - Per land cover: area intersecting both SSSI and HF (parallel to landCoversForParcel)
 * @property {{[actionCode: string]: boolean}} [sssiActionEligibility] - Whether each action is eligible for SSSI land
 * @property {{[actionCode: string]: boolean}} [hfActionEligibility] - Whether each action is eligible for HF land
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
 * @property {ExplanationSection} stackExplanations - The stack explanation section
 * @property {ExplanationSection} resultExplanation - The resultexplanation section
 * @property {Stack[]} stacks - The stacks
 */

/**
 * @typedef {object} ProcessedLandCoverData
 * @property {string[]} mergedLandCoverCodesForAppliedForAction - land cover codes
 * @property {number} totalValidLandCoverSqm - The available area
 * @property {ExplanationSection} totalValidLandCoverExplanations - Explanation section
 */

/**
 * @typedef {object} EligibilityEntry
 * @property {number} landCoverIndex - Index into landCoversForParcel
 * @property {string} landCoverClassCode - The land cover class code
 * @property {number} areaSqm - Area of this land cover in square meters
 */

/**
 * @typedef {object} AdjustedAction
 * @property {string} actionCode - The action code
 * @property {number} areaSqm - Area of the action in square meters
 */

/**
 * @typedef {object} Allocation
 * @property {string} actionCode - The action code
 * @property {number} landCoverIndex - Index into landCoversForParcel
 * @property {number} areaSqm - Area allocated in square meters
 */

/**
 * @typedef {object} TargetAvailabilityEntry
 * @property {number} landCoverIndex - Index into landCoversForParcel
 * @property {number} totalAreaSqm - Total area of this land cover
 * @property {number} usedByExistingSqm - Area consumed by existing actions
 * @property {number} availableSqm - Area available for the target action
 */

/**
 * @typedef {object} AacExplanations
 * @property {{[actionCode: string]: EligibilityEntry[]}} eligibility - Which land covers each action can use
 * @property {AdjustedAction[]} adjustedActions - Actions filtered/capped for the LP
 * @property {string[][]} incompatibilityCliques - Groups of mutually incompatible actions
 * @property {Allocation[]} allocations - How the LP placed each existing action across land covers
 * @property {TargetAvailabilityEntry[]} targetAvailability - Per-land-cover breakdown for the target action
 * @property {Stack[]} stacks - Ephemeral stacks derived from the LP solution
 */

/**
 * @typedef {object} AacContext
 * @property {object|null} solution - Raw LP solver result (null if no LP was run)
 * @property {string} targetLabel - The internal label used for the target action (with __target suffix)
 * @property {ActionWithArea[]} existingActions - Existing actions on the parcel with their areas
 * @property {LandCover[]} landCoversForParcel - The parcel's land covers
 * @property {Map<string, number[]>} eligibility - Action -> eligible land cover indices
 * @property {string[][]} cliques - Maximal incompatibility cliques
 * @property {CompatibilityCheckFn} compatibilityCheckFn - Compatibility check function
 */

/**
 * @typedef {object} AvailableAreaForActionLp
 * @property {boolean} feasible - Whether the LP was feasible (false means existing actions cannot be arranged on the parcel)
 * @property {AacContext|null} context - Context data for generating explanations
 * @property {number} availableAreaSqm - The available area
 * @property {number} totalValidLandCoverSqm - The total valid land cover area
 * @property {number} availableAreaHectares - The available area in hectares
 */

/**
 * @typedef {object} AvailableAreaForAction
 * @property {Stack[]} [stacks] - Stacks (absent when using LP-based implementation)
 * @property {object} explanations - Explanations
 * @property {number} availableAreaSqm - The available area
 * @property {number} totalValidLandCoverSqm - The total valid land cover area
 * @property {number} availableAreaHectares - The available area in hectares
 */
