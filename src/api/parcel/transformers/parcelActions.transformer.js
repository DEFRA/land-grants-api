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
    availableArea: {
      unit: 'ha',
      value: totalAvailableArea
    }
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
      size: {
        unit: 'ha',
        value: landParcel.area_sqm
      },
      actions
    }
  }
}

export { actionTransformer, parcelTransformer }
