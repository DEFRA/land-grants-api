import {
  applicationUnitOfMeasurement,
  sqmToHaRounded
} from '~/src/api/common/helpers/measurement.js'

/**
 * Transform size to application unit of measurement
 * @param {number} area - The area to transform
 * @returns {object} The transformed size
 */
function transformSize(area) {
  return {
    unit: applicationUnitOfMeasurement,
    value: sqmToHaRounded(area)
  }
}

/**
 * Transform parcel and actions to land parcel and actions
 * @returns {object} The land action data with available area
 * @param {object} action - The actions to merge
 * @param {object} totalAvailableArea - Total Available Area
 */
function actionTransformer(action, totalAvailableArea) {
  return {
    code: action.code,
    description: action.description,
    availableArea: transformSize(totalAvailableArea)
  }
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
      size: transformSize(landParcel.area_sqm),
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
    size: transformSize(landParcel.area_sqm)
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

export {
  actionTransformer,
  parcelTransformer,
  parcelActionsTransformer,
  transformSize
}
