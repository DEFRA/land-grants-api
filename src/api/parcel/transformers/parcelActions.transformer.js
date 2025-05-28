/**
 * Transform parcel and actions to land parcel and actions
 * @returns {object} The land action data with available area
 * @param {object} landParcel - The parcel to merge
 * @param {object} actions - The actions to merge
 * @param {object} totalAvailableArea - Total Available Area
 */
function parcelActionsTransformer(landParcel, actions, totalAvailableArea) {
  return {
    parcel: {
      parcelId: landParcel?.parcel_id,
      sheetId: landParcel?.sheet_id,
      size: {
        unit: 'ha',
        value: landParcel.area_sqm
      },
      actions: actions?.map((action) => ({
        code: action.code,
        description: action.description,
        availableArea: {
          unit: 'ha',
          value: totalAvailableArea
        }
      }))
    }
  }
}

export { parcelActionsTransformer }
