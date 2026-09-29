import {
  isAreaUnit,
  isLengthUnit
} from '~/src/features/common/constants/unit_type.js'
import {
  lengthActionsTransformer,
  areaActionsTransformer
} from '~/src/features/parcel/transformers/parcelActions.transformer.js'

/**
 * @import {AgreementAction} from '~/src/features/agreements/agreements.d.js'
 * @import {Action} from '~/src/features/actions/action.d.js'
 * @import {ActionWithArea} from '~/src/features/available-area/available-area.d.js'
 * @import {ActionWithLength} from '~/src/features/available-length/available-length.d.js'
 */

/**
 * @typedef {object} PreparedActions
 * @property {Action[]} displayedActions - The enabled actions this request reports
 * @property {Record<string, string|undefined>} unitByActionCode - Configured unit of measurement by action code
 */

/**
 * The enabled actions a request reports. Does not depend on the parcel, so a
 * request works it out once.
 * @param {Action[]} enabledActions - The enabled actions
 * @returns {Action[]} The actions to report
 */
export function getDisplayedActions(enabledActions) {
  return enabledActions.filter((enabledAction) => enabledAction.display)
}

/**
 * The configured unit of measurement for every enabled action, keyed by code.
 * Does not depend on the parcel, so a request works it out once.
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
 * The unit an existing action competes in. Enabled-action config wins; where
 * there is none for its code, the action's own unit is all we have to go on.
 * @param {AgreementAction} existingAction - The existing or planned action
 * @param {Record<string, string|undefined>} unitByActionCode - Configured unit of measurement by action code
 * @returns {string|undefined} The unit it competes in
 */
function unitCompetedFor(existingAction, unitByActionCode) {
  const configuredUnit = unitByActionCode[existingAction.actionCode]
  return configuredUnit === undefined ? existingAction.unit : configuredUnit
}

/**
 * The existing and planned actions competing in each unit, worked out once for
 * the parcel - neither list depends on which action is being applied for.
 * @param {AgreementAction[]} actions - The existing/planned actions on the parcel
 * @param {Record<string, string|undefined>} unitByActionCode - Configured unit of measurement by action code
 * @returns {{area: ActionWithArea[], length: ActionWithLength[]}} The competing actions by unit
 */
export function getCompetingActions(actions, unitByActionCode) {
  const competingIn = (isCompetingUnit) =>
    actions.filter((existingAction) =>
      isCompetingUnit(unitCompetedFor(existingAction, unitByActionCode))
    )

  return {
    area: areaActionsTransformer(competingIn(isAreaUnit)),
    length: lengthActionsTransformer(competingIn(isLengthUnit))
  }
}
