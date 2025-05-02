/**
 * Retrieves land data records by parcel ID and sheet ID.
 * @async
 * @function getLandData
 * @param {string} parcelId - The unique identifier for the parcel.
 * @param {string} sheetId - The sheet identifier the parcel belongs to.
 * @param {object} deps - Dependency injection object.
 * @param {object} deps.db - Database client.
 * @param {object} deps.logger - Logger instance.
 * @returns {Promise<object[]>} Resolves with an array of land parcel records.
 * @throws {Error} If the database query fails or inputs are invalid.
 */
async function getLandData(parcelId, sheetId, { db, logger }) {
  let client

  try {
    logger.info(
      `Retrieving land parcels for parcelId: ${parcelId} sheetId ${sheetId}`
    )

    client = await db.connect()

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
