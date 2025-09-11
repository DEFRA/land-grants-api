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
 * @param {ParcelDetails} parcelDetails - The parcel details
 * @param {Agreement[]} agreements - The agreements
 * @param {Action[]} plannedActions - planned actions
 * @param {CompatibilityCheckFn} compatibilityCheckFn - Compatibility check function
 * @param {{logger: object, server: {postgresDb: object}}} request - The request object
 * @returns {Promise<RulesResult>} The validation result
 */
export const validateLandAction = async (
  action,
  parcelDetails,
  agreements,
  plannedActions,
  compatibilityCheckFn,
  allEnabledActions,
  request
) => {
  const aacDataRequirements = await getAvailableAreaDataRequirements(
    action.code,
    parcelDetails.sheetId,
    parcelDetails.parcelId,
    plannedActions,
    request.server.postgresDb,
    request.logger
  )

  const { availableAreaSqm: parcelAvailableArea } = getAvailableAreaForAction(
    action.code,
    parcelDetails.sheetId,
    parcelDetails.parcelId,
    compatibilityCheckFn,
    plannedActions,
    aacDataRequirements,
    request.logger
  )

  request.logger.info(
    `Parcel available area: ${JSON.stringify(parcelAvailableArea)}`
  )

  const intersectingAreaPercentage = await getMoorlandInterceptPercentage(
    parcelDetails.sheetId,
    parcelDetails.parcelId,
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
 * @import { ParcelDetails } from '~/src/api/common/common.d.js'
 */
/**
 * @import { RulesResult } from '~/src/rules-engine/rules.d.js'
 */
