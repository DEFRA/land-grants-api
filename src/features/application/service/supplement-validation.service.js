import { findAvailableAreaWithinBaseActions } from '~/src/features/available-area/availableAreaWithinBaseActions.js'
import { isAreaUnit } from '~/src/features/common/constants/unit_type.js'
import { normalizeAppliedArea } from '~/src/features/common/helpers/measurement.js'
import { otherAreaActionsOnParcel } from './get-available-area.js'

export const SUPPLEMENT_HAS_BASE_ACTION = 'supplement-has-base-action'
export const SUPPLEMENT_WITHIN_BASE_ACTION_AREA =
  'supplement-within-base-action-area'

const NO_BASE_CODES = new Set()

/**
 * The checks made on a supplement, which come from the compatibility matrix
 * rather than the action's configured rules, so they apply to every
 * supplement: it is applied for on the same parcel as one of its base actions,
 * and its quantity fits within what its base actions have left for it once the
 * other supplements on them have their share. The parcel-level available area
 * rule configured on the supplement covers the rest of the parcel: other base
 * actions, agreements and land covers.
 * @param {ActionRequest} action - The action applied for
 * @param {LandAction} landAction - The parcel and every action applied for on it
 * @param {Action[]} actions - All enabled actions
 * @param {Map<string, Set<string>>} baseCodesBySupplement - The base actions of each supplement
 * @param {CompatibilityCheckFn} compatibilityCheckFn - The compatibility check
 * @returns {RuleResultItem[]} The results, none for an action that is not an area supplement
 */
export const supplementRuleResults = (
  action,
  landAction,
  actions,
  baseCodesBySupplement,
  compatibilityCheckFn
) => {
  const baseCodes = baseCodesBySupplement.get(action.code)
  const unitOf = (code) =>
    actions.find((a) => a.code === code)?.applicationUnitOfMeasurement
  const unit = unitOf(action.code)

  if (!baseCodes || !isAreaUnit(unit)) {
    return []
  }

  const baseCodesOf = (/** @type {string} */ code) =>
    baseCodesBySupplement.get(code) ?? NO_BASE_CODES

  // The other actions on the parcel, as its available area calculation is given them
  const areaActions = otherAreaActionsOnParcel(action, landAction, actions)

  const ownBaseCodesOnParcel = [
    ...new Set(
      areaActions
        .map((other) => other.actionCode)
        .filter((code) => baseCodes.has(code))
    )
  ]

  if (ownBaseCodesOnParcel.length === 0) {
    return [noBaseActionResult(action.code, baseCodes, actions)]
  }

  const { availableAreaSqm } = findAvailableAreaWithinBaseActions(
    action.code,
    areaActions,
    baseCodesOf,
    compatibilityCheckFn
  )

  return [
    baseActionResult(action.code, ownBaseCodesOnParcel),
    withinBaseActionAreaResult(
      action,
      /** @type {string} */ (unit),
      availableAreaSqm
    )
  ]
}

/**
 * @param {string} code - The supplement
 * @param {Set<string>} baseCodes - Its base actions
 * @param {Action[]} actions - All enabled actions
 * @returns {RuleResultItem} The failed result
 */
const noBaseActionResult = (code, baseCodes, actions) => {
  const enabledBaseCodes = [...baseCodes].filter((baseCode) =>
    actions.some((a) => a.code === baseCode)
  )
  const offered =
    enabledBaseCodes.length > 0 ? enabledBaseCodes : [...baseCodes]

  return {
    name: SUPPLEMENT_HAS_BASE_ACTION,
    passed: false,
    description: 'Is the supplement applied for with its base action?',
    reason: `${code} must be applied for on the same land parcel as its base action`,
    explanations: [
      {
        title: 'Base action',
        lines: [
          offered.length === 1
            ? `${code} is a supplement of ${offered[0]}, which is not applied for on this land parcel.`
            : `${code} is a supplement of ${offered.slice(0, -1).join(', ')} or ${offered.at(-1)}, none of which is applied for on this land parcel.`
        ]
      }
    ]
  }
}

/**
 * @param {string} code - The supplement
 * @param {string[]} baseCodesOnParcel - Its base actions applied for on the parcel
 * @returns {RuleResultItem} The passed result
 */
const baseActionResult = (code, baseCodesOnParcel) => ({
  name: SUPPLEMENT_HAS_BASE_ACTION,
  passed: true,
  description: 'Is the supplement applied for with its base action?',
  reason: `${code} is applied for with its base action ${baseCodesOnParcel.join(', ')}`,
  explanations: [
    {
      title: 'Base action',
      lines: [
        `${code} is a supplement of ${baseCodesOnParcel.join(', ')}, applied for on this land parcel.`
      ]
    }
  ]
})

/**
 * @param {ActionRequest} action - The supplement applied for
 * @param {string} unit - Its unit of measurement
 * @param {number} availableAreaSqm - What its base actions have left for it
 * @returns {RuleResultItem} The result
 */
const withinBaseActionAreaResult = (action, unit, availableAreaSqm) => {
  const {
    unit: displayUnit,
    appliedAreaDisplay,
    availableAreaDisplay,
    appliedAreaSqm,
    availableAreaSqmDisplay
  } = normalizeAppliedArea(unit, action.quantity, availableAreaSqm)

  const explanations = [
    {
      title: 'Base action area',
      lines: [
        `The area of its base action left for ${action.code}, once the other supplements on it have their share, is (${availableAreaDisplay} ${displayUnit}), and the applicant applied for (${appliedAreaDisplay} ${displayUnit}).`
      ]
    }
  ]

  return appliedAreaSqm > availableAreaSqmDisplay
    ? {
        name: SUPPLEMENT_WITHIN_BASE_ACTION_AREA,
        passed: false,
        description: 'Does the supplement fit within its base action?',
        reason:
          'The amount of land must be the same as or less than the area of its base action left for it',
        explanations
      }
    : {
        name: SUPPLEMENT_WITHIN_BASE_ACTION_AREA,
        passed: true,
        description: 'Does the supplement fit within its base action?',
        reason: `The applied figure (${appliedAreaDisplay} ${displayUnit}) is within the area of its base action left for it (${availableAreaDisplay} ${displayUnit})`,
        explanations
      }
}

/**
 * @import { ActionRequest } from '~/src/features/application/application.d.js'
 * @import { Action } from '~/src/features/actions/action.d.js'
 * @import { CompatibilityCheckFn } from '~/src/features/available-area/available-area.d.js'
 * @import { LandAction } from '~/src/features/payment/payment.d.js'
 * @import { RuleResultItem } from '~/src/features/rules-engine/rules.d.js'
 */
