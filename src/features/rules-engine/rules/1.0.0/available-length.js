
haToSqm,
  sqmToHaRounded
} from '~/src/features/common/helpers/measurement.js'

/**
 * @import { RuleEngineApplication } from '~/src/features/rules-engine/rules.d.js'
 * @import { ActionRule } from '~/src/features/actions/action.d.js'
 */

// This rule allows applying for a partial or total area up to available area.

/**
 * @param {RuleEngineApplication} application - The application to execute the rule on
 * @param {ActionRule} rule - The rule to execute
 * @returns {RuleResultItem} - The result of the rule
 */
export const appliedForTotalOrPartialAvailableArea = {
  execute: (application, rule) => {
  }
}
