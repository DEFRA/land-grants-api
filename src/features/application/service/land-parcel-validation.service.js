import { validateActionOnParcel } from './action-validation.service.js'
import { supplementRuleResults } from './supplement-validation.service.js'

/**
 * Adds the supplement checks to an action's result. They need every action
 * applied for on the parcel, so they run here rather than with the action's
 * configured rules.
 * @param {object} actionResult - The action's validation result
 * @param {RuleResultItem[]} supplementResults - The supplement checks, none for an action that is not a supplement
 * @returns {object} The action's validation result, with the supplement checks
 */
const withSupplementResults = (actionResult, supplementResults) =>
  supplementResults.length === 0
    ? actionResult
    : {
        ...actionResult,
        hasPassed:
          actionResult.hasPassed &&
          supplementResults.every((result) => result.passed),
        rules: [...actionResult.rules, ...supplementResults]
      }

/**
 * Validate land parcel actions
 * @param {object} landAction - The land action requested for validation
 * @param {object} actions - The actions
 * @param {CompatibilityCheckFn} compatibilityCheckFn - The compatibility check function
 * @param {object} request - The request
 * @param {AgreementAction[]} agreements - Existing agreements related to this land parcel
 * @param {Map<string, Set<string>>} [baseCodesBySupplement] - The base actions of each supplement
 */
export const validateLandParcelActions = async (
  landAction,
  actions,
  compatibilityCheckFn,
  request,
  agreements,
  baseCodesBySupplement = new Map()
) => {
  if (!landAction || !actions || !compatibilityCheckFn) {
    throw new Error('Unable to validate land parcel actions')
  }

  const actionResults = await Promise.all(
    landAction.actions.map(async (action) => {
      const actionResult = await validateActionOnParcel(
        action,
        actions,
        agreements,
        compatibilityCheckFn,
        landAction,
        request
      )

      return withSupplementResults(
        actionResult,
        supplementRuleResults(
          action,
          landAction,
          actions,
          baseCodesBySupplement,
          compatibilityCheckFn
        )
      )
    })
  )

  return {
    sheetId: landAction.sheetId,
    parcelId: landAction.parcelId,
    actions: actionResults
  }
}

/**
 * @import { AgreementAction } from '~/src/features/agreements/agreements.d.js'
 * @import { CompatibilityCheckFn } from '~/src/features/available-area/available-area.d.js'
 * @import { RuleResultItem } from '~/src/features/rules-engine/rules.d.js'
 */
