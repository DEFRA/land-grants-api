import {
  applicationUnitOfMeasurement,
  haToSqm
} from '~/src/api/common/helpers/measurement.js'

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
 * Transform parcel and actions to land parcel and actions
 * @param {Action} action - The actions to merge
 * @param {AvailableAreaForAction | null} availableArea - Total Available Area
 * @returns {object} The land action data with available area
 */
function actionTransformer(action, availableArea = null, showResults = false) {
  const response = {
    code: action.code,
    description: action.description,
    availableArea: Number.isFinite(availableArea?.availableAreaHectares)
      ? sizeTransformer(availableArea?.availableAreaHectares ?? 0)
      : undefined,
    ...action.payment
  }

  if (showResults) {
    return {
      ...response,
      results: {
        totalValidLandCoverSqm: availableArea?.totalValidLandCoverSqm,
        stacks: availableArea?.stacks,
        explanations: availableArea?.explanations
      }
    }
  }

  return response
}

/**
 * Transform parcel and actions to land parcel and actions
 * @param {object} landParcel - The parcel to merge
 * @param {object} actions - The actions to merge
 */
function parcelTransformer(landParcel, actions) {
  return {
    parcel: {
      parcelId: landParcel?.parcel_id,
      sheetId: landParcel?.sheet_id,
      size: sizeTransformer(landParcel.area_sqm),
      actions
    }
  }
}

/**
 * Transform parcel to land parcel
 * @param {object} landParcel - The parcel to merge
 */
function landParcelTransformer(landParcel) {
  return {
    parcelId: landParcel?.parcel_id,
    sheetId: landParcel?.sheet_id,
    size: sizeTransformer(landParcel.area_sqm)
  }
}

/**
 * Transform parcel and actions to land parcel and actions
 * @param {object} landParcel - The parcel to merge
 * @param {object} actions - The actions to merge
 */
function parcelActionsTransformer(landParcel, actions) {
  return {
    ...landParcelTransformer(landParcel),
    actions
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
      areaSqm: haToSqm(a.quantity)
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
        sssiConsentRequiredAction[action.code]?.cavets?.isConsentRequired ??
        false
    }))
  }))
}

export {
  actionTransformer,
  parcelActionsTransformer,
  parcelTransformer,
  plannedActionsTransformer,
  sizeTransformer,
  sssiConsentRequiredActionTransformer
}

/**
 * @import { AgreementAction } from "../../agreements/agreements.d.js"
 * @import { Action, ActionRequest } from "../../actions/action.d.js"
 * @import { AvailableAreaForAction } from "~/src/available-area/available-area.d.js"
 */
