/**
 * Get a land data
 * @param {string} sheetId - The sheetId
 * @param {string} parcelId - The parcelId
 * @param {object} {db, logger} - DB connection and logger object
 * @returns {object} The land data
 */
async function getLandData(sheetId, parcelId, { db, logger }) {
  let client

  try {
    logger.info(
      `Connecting to DB to fetch info parcelId: ${parcelId} sheetId ${sheetId}`
    )
    client = await db.connect()
    logger.info(
      `Retrieving land parcels for parcelId: ${parcelId} sheetId ${sheetId}`
    )
    /**
     SELECT 
 LC.area_sqm as LandCoverArea, LP.area_sqm as LandParcelArea, ST_Area(ST_Difference( LP.geom, LC.geom)) AS remaining_area
 FROM land.land_covers LC,
land.land_parcels LP
 WHERE 
LC.parcel_id = LP.parcel_id and LC.sheet_id = LP.sheet_id
AND LC.land_cover_class_code in ('131', '130', )
AND LC.parcel_id = '3512' and LC.sheet_id = 'SD5542'
     * 
     */
    const query =
      'SELECT * FROM land.land_parcels WHERE sheet_id = $1 and parcel_id = $2'
    const values = [sheetId, parcelId]

    const result = await client.query(query, values)
    logger.info(
      `Retrieved land parcels for parcelId:-  ${parcelId} sheetId ${sheetId} , ${result.rows}`
    )

    return result.rows
  } catch (error) {
    logger.error('Error executing get Land parcels query', error)
    return
  } finally {
    if (client) {
      client.release()
    }
  }
}

export { getLandData }
