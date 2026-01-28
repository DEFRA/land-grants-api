import { sqmToHaRounded } from '~/src/api/common/helpers/measurement.js'
import { getMoorlandInterceptPercentage } from '~/src/api/parcel/queries/getMoorlandInterceptPercentage.js'
import {
  getAvailableAreaDataRequirements,
  getAvailableAreaForAction
} from '~/src/available-area/availableArea.js'
import { rules } from '~/src/rules-engine/rules/index.js'
import { executeRules } from '~/src/rules-engine/rulesEngine.js'
import { plannedActionsTransformer } from '../../parcel/transformers/parcelActions.transformer.js'
import {
  actionResultTransformer,
  ruleEngineApplicationTransformer
} from '../transformers/application.transformer.js'
import { getDataLayerQuery } from '../../data-layers/queries/getDataLayer.query.js'

/**
 * Validate a land action
 * @param {ActionRequest} action - The action
 * @param {Action[]} actions - All enabled actions
 * @param {AgreementAction[]} agreements - The agreements
 * @param {CompatibilityCheckFn} compatibilityCheckFn - Compatibility check function
 * @param {LandAction} landAction - The land action
 * @param {{logger: object, server: {postgresDb: object}}} request - The request object
 * @returns {Promise<ActionRuleResult>} The validation result
 */
export const validateLandAction = async (
  action,
  actions,
  agreements,
  compatibilityCheckFn,
  landAction,
  request
) => {
  if (!landAction || !actions || !compatibilityCheckFn) {
    throw new Error('Unable to validate land action')
  }

  const aacDataRequirements = await getAvailableAreaDataRequirements(
    action.code,
    landAction.sheetId,
    landAction.parcelId,
    plannedActionsTransformer(agreements),
    request.server.postgresDb,
    request.logger
  )

  const availableArea = getAvailableAreaForAction(
    action.code,
    landAction.sheetId,
    landAction.parcelId,
    compatibilityCheckFn,
    plannedActionsTransformer(agreements),
    aacDataRequirements,
    request.logger
  )

  const intersectingAreaPercentage = await getMoorlandInterceptPercentage(
    landAction.sheetId,
    landAction.parcelId,
    request.server.postgresDb,
    request.logger
  )

  const dataLayerData = await getDataLayerQuery(
    landAction.sheetId,
    landAction.parcelId,
    request.server.postgresDb,
    request.logger
  )

  const application = ruleEngineApplicationTransformer(
    action.quantity,
    action.code,
    sqmToHaRounded(availableArea.availableAreaSqm),
    intersectingAreaPercentage,
    dataLayerData,
    agreements
  )

  const ruleToExecute = actions.find((a) => a.code === action.code)
  const ruleResult = executeRules(rules, application, ruleToExecute?.rules)
  return actionResultTransformer(action, actions, availableArea, ruleResult)
}

/**
 * @import { ActionRuleResult, Action } from '~/src/api/actions/action.d.js'
 * @import { CompatibilityCheckFn } from '~/src/available-area/available-area.d.js'
 * @import { AgreementAction } from '~/src/api/agreements/agreements.d.js'
 * @import { LandAction } from '~/src/api/payment/payment.d.js'
 * @import { ActionRequest } from '~/src/api/application/application.d.js'
 */
