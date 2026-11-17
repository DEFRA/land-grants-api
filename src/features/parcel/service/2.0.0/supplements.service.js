import {
  HECTARES,
  isAreaUnit
} from '~/src/features/common/constants/unit_type.js'
import {
  haToSqm,
  sqmToHaRounded
} from '~/src/features/common/helpers/measurement.js'
import { findMaximumAvailableArea } from '~/src/features/available-area/availableArea.js'
import { getActionsForParcel } from './parcel.service.js'
import { noAvailabilityReason } from './unavailability.js'

/**
 * An area quantity in square metres, from hectares or square metres.
 * @param {{quantity: number, unit: string}} selected - The quantity and its unit
 * @returns {number} The area in square metres
 */
const toSqm = ({ quantity, unit }) =>
  unit === HECTARES ? haToSqm(quantity) : quantity

/**
 * Every action selected on the parcel: the base action, the supplements
 * selected so far, and the other planned actions. An entry in the planned
 * actions for the base or a selected supplement is left out, as those are
 * given on their own.
 * @param {object} params
 * @param {SelectedAction} params.baseAction - The selected base action and its area
 * @param {SelectedAction[]} params.selectedSupplements - The supplements selected so far
 * @param {SelectedAction[]} params.plannedActions - The other actions selected on the parcel
 * @returns {SelectedAction[]} The actions selected on the parcel
 */
const actionsSelectedOnParcel = ({
  baseAction,
  selectedSupplements,
  plannedActions
}) => {
  const givenCodes = new Set([
    baseAction.actionCode,
    ...selectedSupplements.map((selected) => selected.actionCode)
  ])

  return [
    ...plannedActions.filter((planned) => !givenCodes.has(planned.actionCode)),
    baseAction,
    ...selectedSupplements
  ]
}

// The base action's area, as the only land in the calculation of what is
// left of it for a supplement
const BASE_ACTION_AREA = 'base-action-area'
const BASE_ACTION_LAND_COVER = [
  { landCoverCode: BASE_ACTION_AREA, landCoverClassCode: BASE_ACTION_AREA }
]

/**
 * How much of the base action's area is left for a supplement, given the other
 * supplements selected on it. Supplements sit within their base, so they share
 * its area: those without a SUPCO row cannot overlap, but can sit side by side.
 * This runs the available area calculation over the base action's area alone.
 * @param {string} supplementCode - The supplement to work out
 * @param {SelectedAction[]} otherSupplements - The other supplements selected on the base
 * @param {number} baseAreaSqm - The base action's area
 * @param {CompatibilityCheckFn} compatibilityCheckFn - The compatibility check
 * @returns {number} The area left for the supplement, in square metres
 */
const availableWithinBaseActionSqm = (
  supplementCode,
  otherSupplements,
  baseAreaSqm,
  compatibilityCheckFn
) => {
  if (otherSupplements.length === 0) {
    return baseAreaSqm
  }

  const { availableAreaSqm } = findMaximumAvailableArea(
    supplementCode,
    otherSupplements.map((other) => ({
      actionCode: other.actionCode,
      areaSqm: toSqm(other)
    })),
    compatibilityCheckFn,
    {
      landCoverCodesForAppliedForAction: BASE_ACTION_LAND_COVER,
      landCoversForParcel: [
        { landCoverClassCode: BASE_ACTION_AREA, areaSqm: baseAreaSqm }
      ],
      landCoversForExistingActions: Object.fromEntries(
        otherSupplements.map((other) => [
          other.actionCode,
          BASE_ACTION_LAND_COVER
        ])
      ),
      landCoverToString: (code) => code
    }
  )

  return availableAreaSqm
}

/**
 * Caps a supplement's availability at what is left for it within its base
 * action. A supplement capped to nothing is unavailable. The flag for the
 * supplement's own supplements is dropped, as supplements have none.
 * @param {object} supplementWithFlag - The supplement, as the parcels endpoint reports it
 * @param {number} withinBaseSqm - The area left for it within the base action
 * @returns {object} The supplement, with its availability capped
 */
const capWithinBaseAction = (supplementWithFlag, withinBaseSqm) => {
  const supplement = { ...supplementWithFlag }
  delete supplement.hasSupplements
  const { availability, isAvailable } = supplement

  if (availability.value === null || !isAreaUnit(availability.unit)) {
    return supplement
  }

  const withinBase =
    availability.unit === HECTARES
      ? sqmToHaRounded(withinBaseSqm)
      : withinBaseSqm

  if (availability.value <= withinBase) {
    return supplement
  }

  const capped = {
    ...supplement,
    availability: { ...availability, value: withinBase }
  }

  // An unavailable supplement keeps its own reason, such as a failed rule
  return withinBase > 0 || !isAvailable
    ? capped
    : { ...capped, isAvailable: false, unavailableReason: noAvailabilityReason }
}

/**
 * The supplements of a base action, each with its availability. Each
 * supplement goes through the available area calculation the parcels endpoint
 * uses, with every other action on the parcel competing for its land: the
 * other planned actions, the other selected supplements (those without a SUPCO
 * row cannot overlap, but can sit side by side) and the existing agreements.
 * Its own selection is left out, so its availability is how much it could
 * cover at most. That is then capped at what is left for it within the base
 * action's area, once the other supplements selected on it have their share.
 *
 * Like /parcels, this reports what is available rather than judging the
 * quantities selected: /application/validate checks those.
 * @param {object} params
 * @param {LandParcelDb} params.parcel - The parcel
 * @param {SelectedAction} params.baseAction - The selected base action and its area
 * @param {SelectedAction[]} params.selectedSupplements - The supplements selected so far
 * @param {SelectedAction[]} params.plannedActions - The other actions selected on the parcel
 * @param {Action[]} params.supplementActions - The base action's enabled and displayed supplements, in display order
 * @param {Record<string, string | undefined>} params.unitByActionCode - The unit of each enabled action
 * @param {CompatibilityCheckFn} params.compatibilityCheckFn - The compatibility check
 * @param {AgreementAction[]} params.agreements - The current agreements on the parcel
 * @param {object} params.request - The hapi request, for its database and logger
 * @returns {Promise<object[]>} The supplements, shaped as the parcels endpoint shapes actions
 */
export async function getSupplementsWithAvailability({
  parcel,
  baseAction,
  selectedSupplements,
  plannedActions,
  supplementActions,
  unitByActionCode,
  compatibilityCheckFn,
  agreements,
  request
}) {
  const selectedOnParcel = actionsSelectedOnParcel({
    baseAction,
    selectedSupplements,
    plannedActions
  })
  const baseAreaSqm = toSqm(baseAction)

  return Promise.all(
    supplementActions.map(async (supplement) => {
      const { actions } = await getActionsForParcel(
        parcel,
        {
          fields: ['actions'],
          plannedActions: selectedOnParcel.filter(
            (selected) => selected.actionCode !== supplement.code
          )
        },
        false,
        { displayedActions: [supplement], unitByActionCode },
        compatibilityCheckFn,
        request,
        agreements
      )

      const withinBaseSqm = availableWithinBaseActionSqm(
        supplement.code,
        selectedSupplements.filter(
          (selected) => selected.actionCode !== supplement.code
        ),
        baseAreaSqm,
        compatibilityCheckFn
      )

      return capWithinBaseAction(actions[0], withinBaseSqm)
    })
  )
}

/**
 * @typedef {object} SelectedAction
 * @property {string} actionCode
 * @property {number} quantity
 * @property {string} unit
 */

/**
 * @import { Action } from '~/src/features/actions/action.d.js'
 * @import { AgreementAction } from '~/src/features/agreements/agreements.d.js'
 * @import { CompatibilityCheckFn } from '~/src/features/available-area/available-area.d.js'
 * @import { LandParcelDb } from '~/src/features/parcel/parcel.d.js'
 */
