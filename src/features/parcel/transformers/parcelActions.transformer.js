import { haToSqm } from '~/src/features/common/helpers/measurement.js'
import { HECTARES } from '~/src/features/common/constants/unit_type.js'

/**
 * Attach application unit of measurement to size; this is used both for total parcel size (which
 * will usually be provided with unit = hectares) and for action areas and available areas
 * @param {number} area - The area to transform
 * @returns {{unit: string, value: number}} The transformed size
 */
function sizeTransformer(area, unit) {
  return { unit, value: area }
}

/**
 * Transform existing and planned actions to actions with their area in square metres.
 * Callers pass only the actions competing for the parcel's land.
 * @param {AgreementAction[] | null} actions - The existing and planned actions to transform
 * @returns {ActionRequest[]} The transformed actions
 */
function areaActionsTransformer(actions) {
  return (actions ?? []).map((a) => ({
    actionCode: a.actionCode,
    areaSqm: a.unit === HECTARES ? haToSqm(a.quantity) : a.quantity
  }))
}

/**
 * Transform existing and planned actions to actions with their boundary length in metres.
 * Callers pass only the actions competing for the boundary.
 * @param {AgreementAction[] | null} actions - The existing and planned actions to transform
 * @returns {ActionWithLength[]} The transformed actions
 */
function lengthActionsTransformer(actions) {
  return (actions ?? []).map((a) => ({
    actionCode: a.actionCode,
    boundaryLengthMeters: a.quantity
  }))
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
  areaActionsTransformer,
  lengthActionsTransformer,
  sizeTransformer,
  sssiConsentRequiredActionTransformer,
  heferRequiredActionTransformer
}

/**
 * @import { AgreementAction } from "../../agreements/agreements.d.js"
 * @import { Action, ActionRequest } from "../../actions/action.d.js"
 * @import { AvailableAreaForAction } from "~/src/features/available-area/available-area.d.js"
 * @import { ActionWithLength } from "~/src/features/available-length/available-length.d.js"
 */
