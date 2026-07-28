import { haToSqm } from '~/src/features/common/helpers/measurement.js'

const DAL_QUANTITY_UNITS = {
  actionArea: 'sqm',
  actionMTL: 'm',
  actionUnits: 'count'
}
const DAL_QUANTITY_KEYS = ['actionArea', 'actionMTL', 'actionUnits']

const STATUS_SIGNED = 'SIGNED'

/**
 * Transforms actions from DB format to AgreementAction format.
 * @param {object[]} agreements - The agreements to transform.
 * @returns {AgreementAction[]} The transformed agreement actions.
 */
export function agreementActionsTransformer(agreements) {
  if (!agreements || agreements.length === 0) {
    return []
  }

  return agreements[0].actions?.map((action) => {
    return {
      actionCode: action.actionCode,
      quantity: action.quantity,
      unit: action.unit,
      startDate: new Date(action.startDate),
      endDate: new Date(action.endDate)
    }
  })
}

/**
 *
 * @param {AgreementAction[]} agreementActions
 * @param {AgreementAction[]} plannedActions
 * @returns {AgreementAction[]}
 */
export function mergeAgreementsTransformer(agreementActions, plannedActions) {
  return [...(agreementActions || []), ...(plannedActions || [])]
}

/**
 * Extract quantity and unit fields from a DAL GraphQL representation of an agreement action
 *
 * The quantity will be present in one of three fields, actionArea / actionMTL / actionUnits, and
 * the other two will be absent. Unit information isn't provided but will always be hectares for
 * areas, metres for length, and count for countable items (like trees or tractors)
 *
 * Additionally, we'll convert hectares into sqm to avoid passing around floating point numbers
 * @param {import("../../../services/dal/business.d.js").AgreementAction} action The DAL action from which to extract data
 * @returns {object}
 */
function getDalQuantityFields(action) {
  let key = null
  DAL_QUANTITY_KEYS.forEach((k) => {
    const v = action[k]
    if (v !== undefined && v !== null) {
      key = k
    }
  })

  if (key === null) {
    return { quantity: null, units: null }
  }

  const quantity = key === 'actionArea' ? haToSqm(action[key]) : action[key]
  const unit = DAL_QUANTITY_UNITS[key]

  return { quantity, unit }
}

/**
 * Convert Business instance received from DAL to an array of internal AgreementActions
 * @param {Business} business The business to convert
 * @returns {AgreementAction[]} Agreements related to this business
 */
// eslint-disable-next-line import-x/no-unused-modules
export function dalBusinessToAgreements(business, parcelId, sheetId) {
  // Agreement actions are nested in agreement.paymentSchedules so we flatten them out of the
  // agreements array. We also need to filter by agreement status and parcelId + sheetId in order
  // to limit results to relevant ones.
  return (
    (business?.agreements || [])
      .filter((agreement) => agreement.status === STATUS_SIGNED)
      .flatMap((agreement) => agreement.paymentSchedules)
      .filter(
        (action) =>
          action.parcelName === parcelId && action.sheetName === sheetId
      )
      .map((a) => ({
        actionCode: a.optionCode,
        startDate: new Date(a.startDate),
        endDate: new Date(a.endDate),
        ...getDalQuantityFields(a)
      }))
      // Capital actions will have no quantity at all, we'll also filter these out
      .filter((a) => a.quantity !== null)
  )
}

/**
 * @import { AgreementAction } from "../agreements.d.js"
 * @import { Business } from "../../../services/dal/business.d.js"
 */
