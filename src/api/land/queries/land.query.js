/**
 * Get a land data
 * @param {string} parcelId - The parcelId
 * @param {string} sheetId - The sheetId
 * @param {string} db - DB connection object
 * @param {object} logger - The logger
 * @returns {object} The land data
 */
async function getLandData(parcelId, sheetId, db, logger) {
  let client

  try {
    client = await db.connect()
    logger.info(
      `Retrieving land parcels for parcelId: ${parcelId} sheetId ${sheetId}`
    )
    const query =
      'SELECT * FROM land_parcels WHERE parcel_id = $1 and sheet_id = $2'
    const values = [parcelId, sheetId]

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
