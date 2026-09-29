import {
  isAreaUnit,
  isLengthUnit
} from '~/src/features/common/constants/unit_type.js'
import {
  lengthActionsTransformer,
  areaActionsTransformer
} from '~/src/features/parcel/transformers/parcelActions.transformer.js'
import { unitCompetedFor } from '~/src/features/common/helpers/action-unit.js'

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
