import { actionResultTransformer } from '~/src/features/application/transformers/application.transformer.js'
import { isAreaUnit } from '~/src/features/common/constants/unit_type.js'
import { rules } from '~/src/features/rules-engine/rules/index.js'
import { executeRules } from '~/src/features/rules-engine/rulesEngine.js'
import {
  getAvailability,
  existingActionsFit,
  existingActionsDoNotFitResult
} from './availability.service.js'
import { resolveApplicationData } from '../../rules-engine/services/resolveApplicationData.js'

/**
 * Validate one action applied for on a parcel
 * @param {ActionRequest} action - The action
 * @param {Action[]} actions - All enabled actions
 * @param {AgreementAction[]} agreements - The agreements
 * @param {CompatibilityCheckFn} compatibilityCheckFn - Compatibility check function
 * @param {LandAction} landAction - The parcel and every action applied for on it
 * @param {{logger: object, server: {postgresDb: object}}} request - The request object
 * @returns {Promise<ActionRuleResult>} The validation result
 */
export const validateActionOnParcel = async (
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

  const actionConfig = actions.find((a) => a.code === action.code)
  const unit = actionConfig?.applicationUnitOfMeasurement

  const appliedForQuantity = isAreaUnit(unit)
    ? action.quantity
    : Math.round(action.quantity)

  const availability = await getAvailability(
    unit,
    { action, actions, agreements, compatibilityCheckFn, landAction },
    request
  )
  const { availableLength } = availability

  const fit = existingActionsFit(availability)

  if (!fit) {
    const doNotFitResult = existingActionsDoNotFitResult(availability)

    return actionResultTransformer({
      action,
      actions,
      availableLength,
      appliedForQuantity,
      ruleResult: doNotFitResult
    })
  }

  const application = await buildRuleEngineApplication(
    {
      action,
      actions,
      landAction,
      agreements,
      compatibilityCheckFn,
      unit,
      appliedForQuantity,
      availableLength
    },
    request,
    actionConfig?.rules
  )

  const availableArea = application.landParcel?.availableArea ?? null

  const ruleResult = executeRules(
    rules,
    {
      ...application,
      parcelId: landAction.parcelId,
      sheetId: landAction.sheetId,
      actionCode: action.code
    },
    actionConfig?.rules
  )

  return actionResultTransformer({
    action,
    actions,
    availableArea,
    availableLength,
    appliedForQuantity,
    ruleResult
  })
}

/**
 * Fetches parcel data layers and builds the rule engine application object.
 * @param {ApplicationData} applicationData
 * @param {{logger: object, server: {postgresDb: object}}} request
 * @param {ActionRule[]} [actionRules] - The rules to execute
 * @returns {Promise<RuleEngineApplication>}
 */
const buildRuleEngineApplication = async (
  applicationData,
  request,
  actionRules
) => {
  const {
    unit,
    action: { code: actionCode },
    agreements,
    appliedForQuantity
  } = applicationData
  const db = request.server.postgresDb
  const logger = request.logger

  /** @type {Partial<RuleEngineApplication>} */
  const baseApplication = {
    appliedForQuantity,
    applicationUnitOfMeasurement: unit,
    actionCodeAppliedFor: actionCode,
    /** @type {Partial<LandParcel>} */
    landParcel: {
      existingAgreements: agreements ?? []
    }
  }

  const application = await resolveApplicationData(
    actionRules ?? [],
    baseApplication,
    {
      ...applicationData,
      db,
      logger
    }
  )

  return application
}

/**
 * @import { ActionRequest } from '~/src/features/application/application.d.js'
 * @import { ActionRuleResult, Action, ActionRule } from '~/src/features/actions/action.d.js'
 * @import { AgreementAction } from '~/src/features/agreements/agreements.d.js'
 * @import { CompatibilityCheckFn } from '~/src/features/available-area/available-area.d.js'
 * @import { LandAction } from '~/src/features/payment/payment.d.js'
 * @import { RuleEngineApplication, LandParcel } from '~/src/features/rules-engine/rules.d.js'
 * @import { ApplicationData } from '~/src/features/rules-engine/data-requirements.d.js'
 */
