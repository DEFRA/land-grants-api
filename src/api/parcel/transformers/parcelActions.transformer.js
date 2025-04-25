import {
  getParcelArea,
  calculateActionsApplicableArea
} from '~/src/api/parcel/service/parcel.service.js'

/**
 * Transform parcel and actions to land parcel and actions
 * @returns {object} The land action data with available area
 * @param {object} landParcel - The parcel to merge
 * @param {object} actions - The actions to merge
 */
function parcelActionsTransformer(landParcel, actions) {
  return {
    parcel: {
      parcelId: landParcel?.parcelId,
      sheetId: landParcel?.sheetId,
      size: {
        unit: 'ha',
        value: getParcelArea(landParcel?.parcelId)
      },
      actions: actions?.map((action) => ({
        ...action,
        availableArea: {
          ...action.availableArea,
          value: calculateActionsApplicableArea()
        }
      }))
    }
  }
}

export { parcelActionsTransformer }
