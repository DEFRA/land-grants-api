/**
 * @import { CompatibilityCheckFn, ActionWithArea, AvailableAreaDataRequirements, AvailableAreaForAction } from './available-area.d.js'
 * @import { LandCoverCodes } from '~/src/features/land-cover-codes/land-cover-codes.d.js'
 * @import { LandCover } from '~/src/features/parcel/parcel.d.js'
 */

import solver from 'javascript-lp-solver'
import { sqmToHaRounded } from '~/src/features/common/helpers/measurement.js'

/**
 * Finds the maximum available area for a new action on a parcel using
 * a linear programming approach to optimally arrange existing actions.
 *
 * @param {string} applyingForAction - The action code being applied for
 * @param {ActionWithArea[]} existingActions - Existing actions and their areas on the parcel
 * @param {CompatibilityCheckFn} compatibilityCheckFn - Function returning true if two action codes can coexist
 * @param {AvailableAreaDataRequirements} dataRequirements - Pre-fetched land cover and eligibility data
 * @returns {AvailableAreaForAction}
 */
export function findMaximumAvailableArea(
  applyingForAction,
  existingActions,
  compatibilityCheckFn,
  dataRequirements
) {
  return {
    availableAreaHectares: 0,
    stacks: []
  }
}
