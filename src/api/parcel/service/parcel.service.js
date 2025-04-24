/**
 * Enrich land actions data
 * @returns {number} The land action data with available area
 */
function calculateActionsApplicableArea() {
  return 200
}

/**
 * Get land parcel area
 * @returns {number} The land action data with available area
 * @param {string} parcelId - The parcel id
 */
function getParcelArea(parcelId) {
  if (parcelId === '9238') {
    return 440
  }

  return 500
}

/**
 * Split id into sheet id and parcel id
 * @param {string} id - 6-character long alpha-numeric string - 4-character long numeric string
 * @returns {object} The sheet id and parcel id
 */
function splitParcelId(id) {
  try {
    const parts = id.split('-')
    const sheetId = parts[0] || null
    const parcelId = parts[1] || null

    if (!sheetId || !parcelId) {
      throw new Error('Unable to split parcel id')
    }

    return {
      sheetId,
      parcelId
    }
  } catch (error) {
    throw new Error('Unable to split parcel id')
  }
}

export { getParcelArea, calculateActionsApplicableArea, splitParcelId }
