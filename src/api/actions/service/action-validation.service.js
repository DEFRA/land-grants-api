import {
  getAvailableAreaDataRequirements,
  getAvailableAreaForAction
} from '~/src/available-area/availableArea.js'
import { getMoorlandInterceptPercentage } from '~/src/api/parcel/queries/getMoorlandInterceptPercentage.js'
import { applicationTransformer } from '~/src/api/actions/transformers/application.transformer.js'
import { executeRules } from '~/src/rules-engine/rulesEngine.js'
import { sqmToHaRounded } from '~/src/api/common/helpers/measurement.js'
import { rules } from '~/src/rules-engine/rules/index.js'

/**
 * Validate a land action
 * @param {Action} action - The action
 * @param {LandParcel} landParcel - The parcel details
 * @param {object[]} agreements - The agreements
 * @param {Action[]} plannedActions - planned actions
 * @param {CompatibilityCheckFn} compatibilityCheckFn - Compatibility check function
 * @param {Action[]} allEnabledActions - All enabled actions
 * @param {{logger: object, server: {postgresDb: object}}} request - The request object
 * @returns {Promise<RulesResult>} The validation result
 */
export const validateLandAction = async (
  action,
  landParcel,
  agreements,
  plannedActions,
  compatibilityCheckFn,
  allEnabledActions,
  request
) => {
  const aacDataRequirements = await getAvailableAreaDataRequirements(
    action.code,
    landParcel.sheet_id,
    landParcel.parcel_id,
    plannedActions,
    request.server.postgresDb,
    request.logger
  )

  const { availableAreaSqm: parcelAvailableArea } = getAvailableAreaForAction(
    action.code,
    landParcel.sheet_id,
    landParcel.parcel_id,
    compatibilityCheckFn,
    plannedActions,
    aacDataRequirements,
    request.logger
  )

  request.logger.info(
    `Parcel available area: ${JSON.stringify(parcelAvailableArea)}`
  )

  const intersectingAreaPercentage = await getMoorlandInterceptPercentage(
    landParcel.sheet_id,
    landParcel.parcel_id,
    request.server.postgresDb,
    request.logger
  )

  const application = applicationTransformer(
    action.quantity,
    action.code,
    sqmToHaRounded(parcelAvailableArea),
    intersectingAreaPercentage,
    agreements
  )

  const ruleToExecute = allEnabledActions.find((a) => a.code === action.code)
  return executeRules(rules, application, ruleToExecute?.rules)
}

/**
 * @import { RulesResult } from '~/src/rules-engine/rules.d.js'
 * @import { LandParcel } from '~/src/api/parcel/queries/getLandData.query.js'
 * @import { Action } from '~/src/api/actions/action.d.js'
 * @import { CompatibilityCheckFn } from '~/src/available-area/available-area.d.js'
 */
