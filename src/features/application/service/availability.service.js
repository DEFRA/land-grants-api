import { isLengthUnit } from '~/src/features/common/constants/unit_type.js'
import { getAvailableLength } from '~/src/features/available-length/availableLength.js'
import { doNotFitSection } from '~/src/features/available-length/explanations.js'
import {
  EXISTING_ACTIONS_DO_NOT_FIT,
  EXISTING_ACTIONS_DO_NOT_FIT_ON_LENGTH_REASON
} from '~/src/features/parcel/constants/unavailable-reasons.js'

/**
 * What the existing actions leave available for the action applied for, worked out before its rules run.
 * @param {string | undefined} unit - The action's unit of measurement
 * @param {{action: ActionRequest, actions: Action[], agreements: AgreementAction[], compatibilityCheckFn: CompatibilityCheckFn, landAction: LandAction}} applicationData - The action and what competes with it
 * @param {{logger: object, server: {postgresDb: object}}} request - The request object
 * @returns {Promise<Availability>} The availability, with no available length for an action not measured in metres
 */
export const getAvailability = async (unit, applicationData, request) => {
  if (!isLengthUnit(unit)) {
    return { availableLength: undefined }
  }

  const { action, actions, agreements, compatibilityCheckFn, landAction } =
    applicationData

  const availableLength = await getAvailableLength(
    action,
    actions,
    agreements,
    compatibilityCheckFn,
    landAction,
    request.server.postgresDb,
    request.logger
  )

  return { availableLength }
}

/**
 * Whether the existing actions all fit the parcel. Area actions leave this to their rules.
 * @param {Availability} availability - What the existing actions leave available
 * @returns {boolean} False only when the existing actions cannot all fit the boundary
 */
export const existingActionsFit = (availability) =>
  availability.availableLength?.feasible !== false

/**
 * The failure given in place of an action's rules when its existing actions cannot all fit, as /parcels reports it.
 * @param {Availability} availability - What the existing actions leave available, when they do not fit
 * @returns {RulesResult} A failed result shaped like any rule's
 */
export const existingActionsDoNotFitResult = (availability) => {
  // Existing actions only fail to fit when there is an available length that says so
  const availableLength = /** @type {AvailableLength} */ (
    availability.availableLength
  )
  const { title, content } = doNotFitSection(availableLength)

  return {
    passed: false,
    results: [
      {
        name: EXISTING_ACTIONS_DO_NOT_FIT,
        passed: false,
        description: 'Do the existing actions fit the parcel boundary?',
        reason: EXISTING_ACTIONS_DO_NOT_FIT_ON_LENGTH_REASON,
        explanations: [{ title, lines: content }]
      }
    ]
  }
}

/**
 * @typedef {object} Availability
 * @property {TargetedAvailableLength | undefined} availableLength - The available length for a linear action, or undefined for any other
 */

/**
 * @import { ActionRequest } from '~/src/features/application/application.d.js'
 * @import { Action } from '~/src/features/actions/action.d.js'
 * @import { AgreementAction } from '~/src/features/agreements/agreements.d.js'
 * @import { CompatibilityCheckFn } from '~/src/features/available-area/available-area.d.js'
 * @import { LandAction } from '~/src/features/payment/payment.d.js'
 * @import { RulesResult } from '~/src/features/rules-engine/rules.d.js'
 * @import { AvailableLength, TargetedAvailableLength } from '~/src/features/available-length/available-length.d.js'
 */
