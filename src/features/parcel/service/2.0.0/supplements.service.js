import { actionsByCompetingUnit } from '~/src/features/common/helpers/action-unit.js'
import { areaActionsTransformer } from '~/src/features/parcel/transformers/parcelActions.transformer.js'
import { findAvailableAreaWithinBaseActions } from '~/src/features/available-area/availableAreaWithinBaseActions.js'
import { getActionsForParcel } from './parcel.service.js'

const NO_BASE_CODES = new Set()

/**
 * The supplements of the selected base action, each with its availability.
 * Each supplement goes through the available area calculation the parcels
 * endpoint uses, with every other action selected on the parcel competing for
 * its land: other base actions, the other supplements (those without a SUPCO
 * row cannot overlap, but can sit side by side) and the existing agreements.
 * Its own selection counts too, as on /parcels, so its availability is what
 * is left for it on top of it. The calculation holds it to what is left for it within the
 * base action's area, once the other supplements on it have their share, so
 * it is reported as /parcels reports any action held to that figure.
 *
 * A planned supplement is on the base action when its baseAction names it, or
 * when it names none and the base action is one of its bases. Supplements on
 * another base action leave this one's area alone, but still compete for the
 * parcel's land.
 *
 * Like /parcels, this reports what is available rather than judging the
 * quantities selected: /application/validate checks those.
 * @param {object} params
 * @param {LandParcelDb} params.parcel - The parcel
 * @param {string} params.baseActionCode - The selected base action to list the supplements of
 * @param {SelectedAction[]} params.plannedActions - Every action selected on the parcel, the base action among them
 * @param {Action[]} params.supplementActions - The base action's enabled and displayed supplements, in display order
 * @param {Map<string, Set<string>>} params.baseCodesBySupplement - The base actions of each supplement
 * @param {Record<string, string | undefined>} params.unitByActionCode - The unit of each enabled action
 * @param {CompatibilityCheckFn} params.compatibilityCheckFn - The compatibility check
 * @param {AgreementAction[]} params.agreements - The current agreements on the parcel
 * @param {object} params.request - The hapi request, for its database and logger
 * @returns {Promise<object[]>} The supplements, shaped as the parcels endpoint shapes actions
 */
export async function getSupplementsWithAvailability({
  parcel,
  baseActionCode,
  plannedActions,
  supplementActions,
  baseCodesBySupplement,
  unitByActionCode,
  compatibilityCheckFn,
  agreements,
  request
}) {
  const isSupplementOfBase = (/** @type {string} */ code) =>
    baseCodesBySupplement.get(code)?.has(baseActionCode) ?? false
  const onlyThisBase = new Set([baseActionCode])

  // Within the base action, a supplement can only sit on this base action
  const baseCodesOf = (/** @type {string} */ code) =>
    isSupplementOfBase(code) ? onlyThisBase : NO_BASE_CODES

  // The base action and the planned supplements on it, the only land and
  // actions of the calculation within the base action
  const onBaseAction = plannedActions.filter(
    (planned) =>
      planned.actionCode === baseActionCode ||
      (isSupplementOfBase(planned.actionCode) &&
        (planned.baseAction ?? baseActionCode) === baseActionCode)
  )
  const areaActionsOnBase = areaActionsTransformer(
    actionsByCompetingUnit(onBaseAction, unitByActionCode).area
  )

  return Promise.all(
    supplementActions.map(async (supplement) => {
      const { availableAreaSqm: withinBaseSqm } =
        findAvailableAreaWithinBaseActions(
          supplement.code,
          areaActionsOnBase,
          baseCodesOf,
          compatibilityCheckFn
        )

      const {
        actions: [reported]
      } = await getActionsForParcel(
        parcel,
        {
          fields: ['actions'],
          plannedActions
        },
        false,
        {
          displayedActions: [supplement],
          unitByActionCode,
          availableAreaCapSqm: { [supplement.code]: withinBaseSqm }
        },
        compatibilityCheckFn,
        request,
        agreements
      )

      // Supplements have no supplements of their own, so the flag is dropped
      const supplementReported = { ...reported }
      delete supplementReported.hasSupplements

      return supplementReported
    })
  )
}

/**
 * @typedef {object} SelectedAction
 * @property {string} actionCode
 * @property {number} quantity
 * @property {string} unit
 * @property {string} [baseAction] - For a supplement, the base action it sits on
 */

/**
 * @import { Action } from '~/src/features/actions/action.d.js'
 * @import { AgreementAction } from '~/src/features/agreements/agreements.d.js'
 * @import { CompatibilityCheckFn } from '~/src/features/available-area/available-area.d.js'
 * @import { LandParcelDb } from '~/src/features/parcel/parcel.d.js'
 */
