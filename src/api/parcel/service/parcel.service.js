/**
 * Enrich land actions data
 * @returns {number} The land action data with available area
 */
function calculateActionsApplicableArea() {
  const parcelSizeValue = 200
  return parcelSizeValue
}

/**
 * Get land parcel area
 * @returns {number} The land action data with available area
 * @param {string} parcelId - The parcel id
 */
function getParcelArea(parcelId) {
  const parcelSizeValue = parcelId === '9238' ? 440 : 500

  return parcelSizeValue
}

/**
 * Split id into sheet id and parcel id
 * @param {string} id - 6-character long alpha-numeric string - 4-character long numeric string
 * @returns {object} The sheet id and parcel id
 */
function splitParcelId(id, logger) {
  try {
    const parts = id?.split('-')
    const sheetId = parts?.[0] || null
    const parcelId = parts?.[1] || null

    if (!sheetId || !parcelId) {
      throw new Error(`Unable to split parcel id ${id}`)
    }

    return {
      sheetId,
      parcelId
    }
  } catch (error) {
    logger.error(`Unable to split parcel id ${id}`, error)
    throw error
  }
}

export { getParcelArea, calculateActionsApplicableArea, splitParcelId }
