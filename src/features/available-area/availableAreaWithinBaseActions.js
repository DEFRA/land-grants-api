import { findMaximumAvailableArea } from './availableArea.js'

// Each base action's area is a land cover of its own in the calculation, so a
// supplement can only use the area of its own bases
const baseActionLandCover = (baseActionCode) => `base-action:${baseActionCode}`

/**
 * The land covers of the base actions an action can sit on.
 * @param {(actionCode: string) => Set<string>} baseCodesOf - The base actions of a supplement
 * @param {string} actionCode - The supplement
 * @param {ActionWithArea[]} baseActions - The base actions on the parcel
 * @returns {{landCoverCode: string, landCoverClassCode: string}[]} The land covers
 */
const baseActionLandCoversFor = (baseCodesOf, actionCode, baseActions) => {
  const baseCodes = baseCodesOf(actionCode)

  return baseActions
    .filter((base) => baseCodes.has(base.actionCode))
    .map((base) => ({
      landCoverCode: baseActionLandCover(base.actionCode),
      landCoverClassCode: baseActionLandCover(base.actionCode)
    }))
}

/**
 * How much of its base actions' area is left for a supplement, once the
 * supplements selected on those base actions, itself among them, have their
 * share. Supplements sit within their base, so they share its area: those with
 * a SUPCO row can stack, and those without one cannot overlap, but can sit
 * side by side.
 *
 * This runs the available area calculation with the base actions' areas as the
 * only land, each supplement able to use the area of its own bases. The
 * actions on the parcel are given as for the parcel-level calculation; the
 * base actions among them are those any supplement on the parcel, or this
 * one, can sit on. Where a supplement has several base actions on the parcel,
 * their areas are taken to be separate; the parcel-level calculation still
 * bounds the supplement by the parcel's land.
 * @param {string} supplementCode - The supplement to work out
 * @param {ActionWithArea[]} areaActions - The actions on the parcel that compete for its land, as the parcel-level calculation is given them
 * @param {(actionCode: string) => Set<string>} baseCodesOf - The base actions of a supplement, none for an action that is not one
 * @param {CompatibilityCheckFn} compatibilityCheckFn - The compatibility check
 * @returns {{feasible: boolean, availableAreaSqm: number}} The area left for the supplement, in square metres, and whether the supplements selected fit their bases
 */
export const findAvailableAreaWithinBaseActions = (
  supplementCode,
  areaActions,
  baseCodesOf,
  compatibilityCheckFn
) => {
  // Its own selection counts as any other, as on /parcels, so what is left is
  // on top of it
  const selectedSupplements = areaActions.filter(
    (action) => baseCodesOf(action.actionCode).size > 0
  )
  const supplementCodes = [
    supplementCode,
    ...selectedSupplements.map((other) => other.actionCode)
  ]
  const baseActions = areaActions.filter((action) =>
    supplementCodes.some((code) => baseCodesOf(code).has(action.actionCode))
  )

  const landCoverCodesForAppliedForAction = baseActionLandCoversFor(
    baseCodesOf,
    supplementCode,
    baseActions
  )

  // The supplements selected on a base action this one can use, itself among them
  const sharing = selectedSupplements
    .map((other) => ({
      ...other,
      landCovers: baseActionLandCoversFor(
        baseCodesOf,
        other.actionCode,
        baseActions
      )
    }))
    .filter((other) => other.landCovers.length > 0)

  const { feasible, availableAreaSqm } = findMaximumAvailableArea(
    supplementCode,
    sharing.map(({ actionCode, areaSqm }) => ({ actionCode, areaSqm })),
    compatibilityCheckFn,
    {
      landCoverCodesForAppliedForAction,
      landCoversForParcel: baseActions.map((base) => ({
        landCoverClassCode: baseActionLandCover(base.actionCode),
        areaSqm: base.areaSqm
      })),
      landCoversForExistingActions: Object.fromEntries(
        sharing.map((other) => [other.actionCode, other.landCovers])
      ),
      landCoverToString: (code) => code
    }
  )

  return { feasible, availableAreaSqm }
}

/**
 * @import { ActionWithArea, CompatibilityCheckFn } from './available-area.d.js'
 */
