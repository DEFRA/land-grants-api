import { sqmToHaRounded } from '~/src/features/common/helpers/measurement.js'
import { executeRules } from '~/src/features/rules-engine/rulesEngine.js'
import { rules } from '~/src/features/rules-engine/rules/index.js'
import {
  EXISTING_ACTIONS_DO_NOT_FIT,
  EXISTING_ACTIONS_DO_NOT_FIT_REASON,
  EXISTING_ACTIONS_EXCEED_AVAILABLE_LENGTH,
  EXISTING_ACTIONS_EXCEED_AVAILABLE_LENGTH_REASON,
  PARCEL_TOO_SHORT_FOR_ACTION
} from '~/src/features/parcel/constants/unavailable-reasons.js'

/**
 * The rules that gate an action on how much boundary is left. A linear action
 * configured with one of these cannot be applied for when it fails.
 */
const LENGTH_RULE_NAMES = new Set(['minimum-length', 'available-length'])

/**
 * Why an area action cannot be applied for, naming the existing actions recorded
 * against the parcel so the RPA knows what to look at. No totals: actions can
 * stack, so their areas cannot be summed, and the valid land cover belongs to
 * the action applied for rather than to them. Hectares, as the rest of the
 * response reports land.
 * @param {AvailableAreaForActionLp} lpResult - The infeasible area result
 * @returns {object} The unavailable reason
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
 * Why a linear action cannot be applied for, or undefined when it can. A rule
 * that rejects the whole available length supplies its own wording; without one
 * configured, only a boundary with nothing left on it puts the action beyond
 * reach.
 * @param {Action} action - The action being applied for
 * @param {AvailableLength} availableLength - The boundary still claimable
 * @returns {object|undefined} The unavailable reason
 */
export function lengthUnavailableReason(action, availableLength) {
  const { boundaryLengthMeters, incompatibleLengthMeters } = availableLength
  const metadata = { boundaryLengthMeters, incompatibleLengthMeters }

  const rule = action.rules?.find((r) =>
    LENGTH_RULE_NAMES.has(r.type ?? r.name)
  )

  if (!rule) {
    return availableLength.availableLength === 0
      ? {
          code: EXISTING_ACTIONS_EXCEED_AVAILABLE_LENGTH,
          reason: EXISTING_ACTIONS_EXCEED_AVAILABLE_LENGTH_REASON,
          metadata
        }
      : undefined
  }

  // Applying for everything that is left, so only the rule's own floor and
  // ceiling can reject it
  const application = {
    appliedForQuantity: availableLength.availableLength,
    actionCodeAppliedFor: action.code,
    landParcel: {
      availability: availableLength.availableLength,
      availableAreaSqm: null,
      parcelSizeSqm: 0,
      existingAgreements: [],
      intersections: {},
      boundaryLength: {
        totalMeters: boundaryLengthMeters,
        incompatibleMeters: incompatibleLengthMeters
      }
    }
  }

  const { results, passed } = executeRules(rules, application, [rule])

  if (passed) {
    return undefined
  }

  const minimumLengthMeters = rule.config?.minimumLengthM

  const parcelTooShort =
    minimumLengthMeters !== undefined &&
    boundaryLengthMeters < minimumLengthMeters

  return {
    code: parcelTooShort
      ? PARCEL_TOO_SHORT_FOR_ACTION
      : EXISTING_ACTIONS_EXCEED_AVAILABLE_LENGTH,
    reason: results[0].reason,
    metadata: { ...metadata, minimumLengthMeters }
  }
}

/**
 * @import {AvailableAreaForActionLp} from '~/src/features/available-area/available-area.d.js'
 * @import {AvailableLength} from '~/src/features/available-length/available-length.d.js'
 * @import {Action} from '~/src/features/actions/action.d.js'
 */
