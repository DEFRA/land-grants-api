/**
 * @import { RuleEngineApplication, RuleResultItem } from '~/src/features/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/features/actions/action.d.js'
 */

// Generic, config-driven manual-check rule: unlike sssi-consent-required/
// hefer-consent-required, this isn't an automated GIS-overlap eligibility check - it
// always passes and always attaches a caveat, flagging that a human (RPA caseworker) must
// review something eligibility rules can't determine automatically. Reusable by any action
// via config alone: set rule.type = 'manual-check-required' and rule.name to the specific
// caveat identity (e.g. 'pond-check-required' for WBD1) - no new land-grants-api code is
// needed for a future action's manual check.

/**
 * @param {RuleEngineApplication} application - The application to execute the rule on
 * @param {ActionRule} rule - The rule to execute
 * @returns {RuleResultItem} - The result of the rule
 */
export const manualCheckRequired = {
  execute: (application, rule) => {
    const { caveatDescription } = rule.config
    const { parcelId, sheetId, actionCode } = application
    const name = rule.name

    const caveat = {
      code: name,
      description: caveatDescription,
      metadata: {
        actionCode,
        parcelId,
        sheetId
      }
    }

    return {
      name,
      passed: true,
      description: rule.description,
      reason: caveatDescription,
      explanations: [
        {
          title: 'Manual check required',
          lines: [caveatDescription]
        }
      ],
      caveat
    }
  }
}
