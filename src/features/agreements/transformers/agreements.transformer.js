import { haToSqm } from '~/src/features/common/helpers/measurement.js'

const DAL_QUANTITY_UNITS = {
  actionArea: 'sqm',
  actionMTL: 'm',
  actionUnits: 'count'
}
const DAL_QUANTITY_KEYS = ['actionArea', 'actionMTL', 'actionUnits']

const STATUS_SIGNED = 'SIGNED'

/**
 * Transforms actions from DB row format (agreements table) to AgreementAction format and group
 * them by parcelId and sheetId.
 * @param {object[]} agreements - Rows from the agreements table in postgres
 * @returns {AgreementsByParcel} Transformed AgreementActions, keyed by parcelId-sheetId
 */
export function dbToAgreements(agreements) {
  return agreements.reduce((acc, agreement) => {
    const key = `${agreement.parcel_id}-${agreement.sheet_id}`
    const actions = agreement.actions?.map((action) => ({
      actionCode: action.actionCode,
      quantity: action.quantity,
      unit: action.unit,
      startDate: new Date(action.startDate),
      endDate: new Date(action.endDate)
    }))

    return { ...acc, [key]: actions }
  }, {})
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
 * @returns {{[key: string]: AgreementAction[]}} Agreements related to this business, keyed by
 *     ${parcelId}-${sheetId}
 */
export function dalBusinessToAgreements(business) {
  // Agreement actions are nested in agreement.paymentSchedules so we flatten them out of the
  // agreements array, and then collect them into an object keyed by `parcelId-sheetId`.
  // We also filter out non-signed agreements as they're not relevant for us.
  return (business?.agreements || [])
    .filter((agreement) => agreement.status === STATUS_SIGNED)
    .flatMap((agreement) => agreement.paymentSchedules)
    .reduce((acc, a) => {
      const key = `${a.parcelName}-${a.sheetName}`
      const transformed = {
        actionCode: a.optionCode,
        startDate: new Date(a.startDate),
        endDate: new Date(a.endDate),
        ...getDalQuantityFields(a)
      }

      // Capital actions will have no quantity at all, we'll also filter these out
      if (transformed.quantity === null) {
        return acc
      }

      return { ...acc, [key]: [...(acc[key] || []), transformed] }
    }, {})
}

/**
 * @import { AgreementAction, AgreementsByParcel } from "../agreements.d.js"
 * @import { Business } from "../../../services/dal/business.d.js"
 */
