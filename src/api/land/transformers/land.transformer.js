/**
 * Transform sql land row to land data
 * @returns {object} The land data
 * @param {object} landDataRows - The land data from db
 */
function landDataTransformer(landDataRows) {
  return landDataRows.map((row) => ({
    parcelId: row.parcel_id,
    sheetId: row.sheet_id,
    areaSqm: row.area_sqm,
    geom: row.geom,
    validFrom: row.valid_from,
    validTo: row.valid_to,
    lastUpdated: row.last_updated
  }))
}

export { landDataTransformer }
