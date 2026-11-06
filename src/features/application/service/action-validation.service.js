import { actionResultTransformer } from '~/src/features/application/transformers/application.transformer.js'
import {
  isAreaUnit,
  isLengthUnit
} from '~/src/features/common/constants/unit_type.js'
import { rules } from '~/src/features/rules-engine/rules/index.js'
import { executeRules } from '~/src/features/rules-engine/rulesEngine.js'
import { getAvailableLength } from '~/src/features/available-length/availableLength.js'
import { doNotFitSection } from '~/src/features/available-length/explanations.js'
import {
  EXISTING_ACTIONS_DO_NOT_FIT,
  EXISTING_ACTIONS_DO_NOT_FIT_ON_LENGTH_REASON
} from '~/src/features/parcel/constants/unavailable-reasons.js'
import { resolveApplicationData } from '../../rules-engine/services/resolveApplicationData.js'

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

  const unit = actions.find(
    (a) => a.code === action.code
  )?.applicationUnitOfMeasurement

  const appliedForQuantity = isAreaUnit(unit)
    ? action.quantity
    : Math.round(action.quantity)

  const availableLength = await availableLengthFor(
    unit,
    { action, actions, agreements, compatibilityCheckFn, landAction },
    request
  )

  if (availableLength?.feasible === false) {
    return actionResultTransformer(
      action,
      actions,
      null,
      existingActionsDoNotFitResult(availableLength)
    )
  }

  const ruleToExecute = actions.find((a) => a.code === action.code)
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
    ruleToExecute?.rules
  )

  const ruleResult = executeRules(
    rules,
    {
      ...application,
      parcelId: landAction.parcelId,
      sheetId: landAction.sheetId,
      actionCode: action.code
    },
    ruleToExecute?.rules
  )

  return actionResultTransformer(
    action,
    actions,
    application.landParcel?.availableArea ?? null,
    ruleResult
  )
}

/**
 * The available length for a linear action, worked out before its rules run.
 * @param {string | undefined} unit - The action's unit of measurement
 * @param {{action: ActionRequest, actions: Action[], agreements: AgreementAction[], compatibilityCheckFn: CompatibilityCheckFn, landAction: LandAction}} applicationData - The action and what competes with it
 * @param {{logger: object, server: {postgresDb: object}}} request - The request object
 * @returns {Promise<AvailableLength | undefined>} The available length, or undefined for an action not measured in metres
 */
const availableLengthFor = async (unit, applicationData, request) => {
  if (!isLengthUnit(unit)) {
    return undefined
  }

  const { action, actions, agreements, compatibilityCheckFn, landAction } =
    applicationData

  return getAvailableLength(
    action,
    actions,
    agreements,
    compatibilityCheckFn,
    landAction,
    request.server.postgresDb,
    request.logger
  )
}

/**
 * The failure given in place of a linear action's rules when its existing actions cannot all fit, as /parcels reports it.
 * @param {AvailableLength} availableLength - The infeasible available length
 * @returns {RulesResult} A failed result shaped like any rule's
 */
const existingActionsDoNotFitResult = (availableLength) => {
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
 * @import { RuleEngineApplication, LandParcel, RulesResult } from '~/src/features/rules-engine/rules.d.js'
 * @import { ApplicationData } from '~/src/features/rules-engine/data-requirements.d.js'
 * @import { AvailableLength } from '~/src/features/available-length/available-length.d.js'
 */
