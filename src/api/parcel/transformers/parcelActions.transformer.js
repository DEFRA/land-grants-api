import {
  applicationUnitOfMeasurement,
  haToSqm
} from '~/src/api/common/helpers/measurement.js'

/**
 * Transform size to application unit of measurement
 * @param {number} area - The area to transform
 * @returns {object} The transformed size
 */
function sizeTransformer(area) {
  return {
    unit: applicationUnitOfMeasurement,
    value: area
  }
}

/**
 * @import {Action} from '../../actions/action.d.js'
 */

/**
 * Transform parcel and actions to land parcel and actions
 * @returns {object} The land action data with available area
 * @param {Action} action - The actions to merge
 * @param {object} availableArea - Total Available Area
 */
function actionTransformer(action, availableArea = null, showResults = false) {
  const response = {
    code: action.code,
    description: action.description,
    availableArea:
      availableArea?.availableAreaHectares ||
      availableArea?.availableAreaHectares === 0
        ? sizeTransformer(availableArea?.availableAreaHectares)
        : undefined
  }

  if (showResults) {
    response.results = {
      totalValidLandCoverSqm: availableArea?.totalValidLandCoverSqm,
      stacks: availableArea?.stacks,
      explanations: availableArea?.explanations
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
 * @returns {Action[]} The transformed current actions
 */
function plannedActionsTransformer(plannedActions) {
  return (plannedActions ?? []).map((a) => {
    return {
      actionCode: a.actionCode,
      areaSqm: haToSqm(a.quantity)
    }
  })
}

export {
  actionTransformer,
  parcelActionsTransformer,
  parcelTransformer,
  plannedActionsTransformer,
  sizeTransformer
}

/**
 * @import { AgreementAction } from "../../agreements/agreements.d.js"
 * @import { Action } from "~/src/available-area/available-area.d.js"
 */
