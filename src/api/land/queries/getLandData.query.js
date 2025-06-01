/**
 * Get a land data
 * @param {string} sheetId - The sheetId
 * @param {string} parcelId - The parcelId
 * @param {{object}} db connection
 * @param {{object}} logger object
 * @returns {object} The land data
 */
async function getLandData(sheetId, parcelId, db, logger) {
  let client

  try {
    logger.info(
      `Connecting to DB to fetch info parcelId: ${parcelId} sheetId ${sheetId}`
    )
    client = await db.connect()
    logger.info(
      `Retrieving land parcels for parcelId: ${parcelId} sheetId ${sheetId}`
    )

    const query =
      'SELECT * FROM land_parcels WHERE sheet_id = $1 and parcel_id = $2'
    const values = [sheetId, parcelId]

    const result = await client.query(query, values)
    logger.info(
      `Retrieved land parcels for parcelId:-  ${parcelId} sheetId ${sheetId} , ${result.rows}`
    )

    return result.rows
  } catch (error) {
    logger.error(`Error executing get Land parcels query: ${error}`)
    return
  } finally {
    if (client) {
      client.release()
    }
  }
}
export { getLandData }
