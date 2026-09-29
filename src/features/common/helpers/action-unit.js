/**
 * The configured unit of measurement for every enabled action, keyed by code.
 * Derived from the enabled-action config alone, so it holds for a whole request.
 * @param {Action[]} enabledActions - The enabled actions
 * @returns {Record<string, string|undefined>} The unit by action code
 */
export function getUnitByActionCode(enabledActions) {
  return Object.fromEntries(
    enabledActions.map(({ code, applicationUnitOfMeasurement }) => [
      code,
      applicationUnitOfMeasurement
    ])
  )
}

/**
 * The unit an action competes in. Enabled-action config wins; where there is
 * none for its code, the action's own unit is all we have to go on, and an
 * action with neither competes for nothing. Sibling actions in an application
 * carry their code as `code`; agreement actions carry it as `actionCode`.
 * @param {{code?: string, actionCode?: string, unit?: string}} action - The existing, planned or sibling action
 * @param {Record<string, string|undefined>} unitByActionCode - Configured unit of measurement by action code
 * @returns {string|undefined} The unit it competes in
 */
export function unitCompetedFor(action, unitByActionCode) {
  const code = /** @type {string} */ (action.code ?? action.actionCode)
  const configuredUnit = unitByActionCode[code]

  return configuredUnit === undefined ? action.unit : configuredUnit
}

/**
 * @import { Action } from '~/src/features/actions/action.d.js'
 */
