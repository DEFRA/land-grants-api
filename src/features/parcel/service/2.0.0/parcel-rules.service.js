import { rules } from '~/src/features/rules-engine/rules/index.js'
import { executeRules } from '~/src/features/rules-engine/rulesEngine.js'
import { REQUIRED_RULE_DATA } from '~/src/features/rules-engine/services/requiredRuleData.js'
import {
  excludeRulesRequiring,
  resolveApplicationData
} from '~/src/features/rules-engine/services/resolveApplicationData.js'

/**
 * Run an action's rules that don't depend on an applied-for quantity. /parcels
 * is asked before anything has been applied for, so those rules can't run yet.
 * Rules needing the available length run only when it was calculated: without
 * it, as for a perimeter that could not be read, there is nothing to check.
 * @param {Action} action - The action whose rules to run
 * @param {AgreementAction[]} actions - The existing/planned actions on the parcel
 * @param {object} context
 * @param {Action[]} context.enabledActions - The enabled actions
 * @param {CompatibilityCheckFn} context.compatibilityCheckFn - The compatibility check function
 * @param {LandParcelDb} context.parcel - The parcel
 * @param {Pool} context.postgresDb - The postgres database
 * @param {Logger} context.logger - The logger
 * @param {AvailableLength} [context.availableLength] - The boundary still claimable, for a linear action
 * @returns {Promise<RulesResult>} The rule results
 */
export async function runParcelRules(action, actions, context) {
  const {
    enabledActions,
    compatibilityCheckFn,
    parcel,
    postgresDb,
    logger,
    availableLength
  } = context

  const quantityFreeRules = excludeRulesRequiring(
    action.rules,
    REQUIRED_RULE_DATA.APPLIED_FOR_QUANTITY
  )

  const parcelRules = availableLength
    ? quantityFreeRules
    : excludeRulesRequiring(
        quantityFreeRules,
        REQUIRED_RULE_DATA.AVAILABLE_LENGTH
      )

  /** @type {Partial<RuleEngineApplication>} */
  const baseApplication = {
    applicationUnitOfMeasurement: action.applicationUnitOfMeasurement,
    actionCodeAppliedFor: action.code,
    /** @type {Partial<LandParcel>} */
    landParcel: {
      existingAgreements: actions,
      parcelSizeSqm: parcel.area_sqm
    }
  }

  const application = await resolveApplicationData(
    parcelRules,
    baseApplication,
    {
      action,
      actions: enabledActions,
      agreements: actions,
      compatibilityCheckFn,
      landAction: {
        sheetId: parcel.sheet_id,
        parcelId: parcel.parcel_id,
        actions: []
      },
      db: postgresDb,
      logger,
      availableLength
    }
  )

  return executeRules(
    rules,
    {
      ...application,
      sheetId: parcel.sheet_id,
      parcelId: parcel.parcel_id,
      actionCode: action.code
    },
    parcelRules
  )
}

/**
 * @import {RulesResult} from '~/src/features/rules-engine/rules.d.js'
 * @import {LandParcelDb} from '~/src/features/parcel/parcel.d.js'
 * @import {AgreementAction} from '~/src/features/agreements/agreements.d.js'
 * @import {Logger} from '~/src/features/common/logger.d.js'
 * @import {Pool} from '~/src/features/common/postgres.d.js'
 * @import {Action} from '~/src/features/actions/action.d.js'
 * @import {RuleEngineApplication, LandParcel} from '~/src/features/rules-engine/rules.d.js'
 * @import {CompatibilityCheckFn} from '~/src/features/available-area/available-area.d.js'
 * @import {AvailableLength} from '~/src/features/available-length/available-length.d.js'
 */
