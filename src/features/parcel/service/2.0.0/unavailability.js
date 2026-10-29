import { sqmToHaRounded } from '~/src/features/common/helpers/measurement.js'
import {
  EXISTING_ACTIONS_DO_NOT_FIT,
  EXISTING_ACTIONS_DO_NOT_FIT_ON_LENGTH_REASON,
  EXISTING_ACTIONS_DO_NOT_FIT_REASON,
  NO_AVAILABILITY,
  NO_AVAILABILITY_REASON,
  RULE_FAILED
} from '~/src/features/parcel/constants/unavailable-reasons.js'

/**
 * Why an area action cannot be applied for, naming the existing actions recorded
 * against the parcel so the RPA knows what to look at. No totals: actions can
 * stack, so their areas cannot be summed, and the valid land cover belongs to
 * the action applied for rather than to them. Hectares, as the rest of the
 * response reports land.
 * @param {AvailableAreaForActionLp} lpResult - The infeasible area result
 * @returns {UnavailableReasonResult} The unavailable reason
 */
export function areaUnavailableReason(lpResult) {
  const existingActions = lpResult.context?.existingActions ?? []

  return {
    code: EXISTING_ACTIONS_DO_NOT_FIT,
    reason: EXISTING_ACTIONS_DO_NOT_FIT_REASON,
    metadata: {
      existingActions: existingActions.map(({ actionCode, areaSqm }) => ({
        actionCode,
        areaHa: sqmToHaRounded(areaSqm)
      }))
    }
  }
}

/**
 * Why a linear action cannot be applied for when its existing actions cannot
 * all fit the boundary, however they are arranged. The length equivalent of an
 * infeasible area, and likewise an RPA matter, so the actions are named.
 * @param {ActionWithLength[]} incompatibleActions - The actions that do not fit
 * @returns {UnavailableReasonResult} The unavailable reason
 */
export function lengthUnavailableReason(incompatibleActions) {
  return {
    code: EXISTING_ACTIONS_DO_NOT_FIT,
    reason: EXISTING_ACTIONS_DO_NOT_FIT_ON_LENGTH_REASON,
    metadata: {
      existingActions: incompatibleActions.map(
        ({ actionCode, billedLengthMeters }) => ({
          actionCode,
          billedLengthMeters
        })
      )
    }
  }
}

const ruleFailedFilter = (f) => !f.passed

/**
 * return rule failed unavailable reason
 * @param {RulesResult} rulesResult
 * @returns {UnavailableReasonResult | undefined}
 */
export function ruleFailedReason(rulesResult) {
  const failedRulesResults = (rulesResult?.results ?? []).filter(
    ruleFailedFilter
  )
  if (failedRulesResults.length === 0) {
    return undefined
  }

  return {
    code: RULE_FAILED,
    reason: failedRulesResults.map((r) => r.reason).join(', '),
    metadata: {
      results: failedRulesResults.map((r) => ({
        name: r.name,
        description: r.description,
        explanations: r.explanations
      }))
    }
  }
}

/**
 * Not available because availability (in terms of area, length, etc.) was calculated as 0
 */
export const noAvailabilityReason = {
  code: NO_AVAILABILITY,
  reason: NO_AVAILABILITY_REASON,
  metadata: {}
}

/**
 * @import {AvailableAreaForActionLp} from '~/src/features/available-area/available-area.d.js'
 * @import {ActionWithLength} from '~/src/features/available-length/available-length.d.js'
 * @import {UnavailableReasonResult} from '~/src/features/parcel/unavailability.d.js'
 * @import {RulesResult} from '~/src/features/rules-engine/rules.d.js'
 */
