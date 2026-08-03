import {
  applicationUnitOfMeasurement,
  haToSqm
} from '~/src/features/common/helpers/measurement.js'
import { HECTARES } from '~/src/features/common/constants/unit_type.js'

/**
 * Transform size to application unit of measurement
 * @param {number} area - The area to transform
 * @returns {{unit: string, value: number}} The transformed size
 */
function sizeTransformer(area) {
  return {
    unit: applicationUnitOfMeasurement,
    value: area
  }
}

/**
 * Transform current actions to actions with area in square meters
 * @param {AgreementAction[] | null} plannedActions - The planned actions to transform
 * @returns {ActionRequest[]} The transformed current actions
 */
function plannedActionsTransformer(plannedActions) {
  return (plannedActions ?? []).map((a) => {
    return {
      actionCode: a.actionCode,
      areaSqm: a.unit === HECTARES ? haToSqm(a.quantity) : a.quantity
    }
  })
}

/**
 * Add sssiConsentRequired property to each action in response parcels
 * @param {object[]} responseParcels - The response parcels to transform
 * @param {Record<string, object>} sssiConsentRequiredAction - Map of action codes to consent required flags
 * @returns {object[]} The transformed parcels with sssiConsentRequired added to actions
 */
function sssiConsentRequiredActionTransformer(
  responseParcels,
  sssiConsentRequiredAction
) {
  if (!responseParcels || !sssiConsentRequiredAction) {
    return responseParcels
  }

  return responseParcels.map((parcel) => ({
    ...parcel,
    actions: parcel.actions?.map((action) => ({
      ...action,
      sssiConsentRequired:
        sssiConsentRequiredAction[action.code]?.caveat?.metadata !== undefined
    }))
  }))
}

/**
 * Add heferRequired property to each action in response parcels
 * @param {object[]} responseParcels - The response parcels to transform
 * @param {Record<string, object>} heferRequiredAction - Map of action codes to consent required flags
 * @returns {object[]} The transformed parcels with heferRequired property added to actions
 */
function heferRequiredActionTransformer(responseParcels, heferRequiredAction) {
  if (!responseParcels || !heferRequiredAction) {
    return responseParcels
  }

  return responseParcels.map((parcel) => ({
    ...parcel,
    actions: parcel.actions?.map((action) => ({
      ...action,
      heferRequired:
        heferRequiredAction[action.code]?.caveat?.metadata !== undefined
    }))
  }))
}

export {
  plannedActionsTransformer,
  sizeTransformer,
  sssiConsentRequiredActionTransformer,
  heferRequiredActionTransformer
}

/**
 * @import { AgreementAction } from "../../agreements/agreements.d.js"
 * @import { Action, ActionRequest } from "../../actions/action.d.js"
 * @import { AvailableAreaForAction } from "~/src/features/available-area/available-area.d.js"
 */
