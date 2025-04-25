import landParcelModel from '~/src/api/parcel/models/parcel.model.js'

/**
 * Get a land parcel
 * @param {string} sheetId - The sheet id
 * @param {string} parcelId - The parcel id
 * @param {object} logger - The logger
 * @returns {object} The land parcel
 */
async function getLandParcel(sheetId, parcelId, logger) {
  try {
    const landParcel = await landParcelModel
      .findOne({ parcelId, sheetId })
      .lean()
    return landParcel
  } catch (error) {
    logger.error(`Unable to get land parcel ${parcelId} ${sheetId}`, error)
    throw error
  }
}

export { getLandParcel }
