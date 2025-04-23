import landParcelModel from '~/src/api/parcel/models/parcel.model.js'

/**
 * Get a land parcel
 * @param {string} sheetId - The sheet id
 * @param {string} parcelId - The parcel id
 * @returns {object} The land parcel
 */
async function getLandParcel(sheetId, parcelId) {
  try {
    const landParcel = await landParcelModel
      .findOne({ parcelId, sheetId })
      .lean()
    return landParcel
  } catch (error) {
    return null
  }
}

export { getLandParcel }
