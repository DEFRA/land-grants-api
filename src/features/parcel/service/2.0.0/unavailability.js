import { sqmToHaRounded } from '~/src/features/common/helpers/measurement.js'
import {
  EXISTING_ACTIONS_DO_NOT_FIT,
  EXISTING_ACTIONS_DO_NOT_FIT_ON_LENGTH_REASON,
  EXISTING_ACTIONS_DO_NOT_FIT_REASON,
  INSUFFICIENT_LENGTH_REMAINING,
  NO_AVAILABILITY,
  NO_AVAILABILITY_REASON,
  PARCEL_TOO_SHORT_FOR_ACTION,
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
 * Why a linear action cannot be applied for when its existing actions claim
 * more than the whole boundary. The length equivalent of an infeasible area,
 * and likewise an RPA matter, so the actions are named.
 * @param {ActionWithLength[]} incompatibleActions - The actions claiming the boundary
 * @returns {UnavailableReasonResult} The unavailable reason
 */
export function exceedsBoundaryReason(incompatibleActions) {
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

/**
 * Why a linear action cannot be applied for when its minimum-length rule
 * rejects what is left, in the rule's own wording: either the boundary was
 * never long enough, or the existing actions fit but leave too little of it.
 * When they leave none of it, the minimum is beside the point, so it reports
 * no availability as any other action left with nothing would.
 * @param {AvailableLength} availableLength - The boundary still claimable
 * @param {MinimumLengthRuleResult} minimumLengthRuleResult - The rule's failed verdict
 * @returns {UnavailableReasonResult} The unavailable reason
 */
export function minimumLengthReason(availableLength, minimumLengthRuleResult) {
  const {
    availableLength: remainingLengthMeters,
    boundaryLengthMeters,
    incompatibleActions
  } = availableLength
  const { reason, minimumLengthMeters } = minimumLengthRuleResult

  const parcelTooShort =
    minimumLengthMeters !== undefined &&
    boundaryLengthMeters < minimumLengthMeters

  if (parcelTooShort) {
    return {
      code: PARCEL_TOO_SHORT_FOR_ACTION,
      reason,
      metadata: { boundaryLengthMeters, minimumLengthMeters }
    }
  }

  if (remainingLengthMeters === 0) {
    return noAvailabilityReason
  }

  return {
    code: INSUFFICIENT_LENGTH_REMAINING,
    reason,
    metadata: {
      existingActions: incompatibleActions.map(
        ({ actionCode, billedLengthMeters }) => ({
          actionCode,
          billedLengthMeters
        })
      ),
      minimumLengthMeters
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
 * @import {AvailableLength, ActionWithLength} from '~/src/features/available-length/available-length.d.js'
 * @import {MinimumLengthRuleResult} from '~/src/features/parcel/parcel.d.js'
 * @import {UnavailableReasonResult} from '~/src/features/parcel/unavailability.d.js'
 * @import {RulesResult} from '~/src/features/rules-engine/rules.d.js'
 */
