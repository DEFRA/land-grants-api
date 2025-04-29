/**
 * Get a land data
 * @param {string} parcelId - The parcelId
 * @param {string} db - DB connection object
 * @param {object} logger - The logger
 * @returns {object} The land data
 */
async function getLandData(parcelId, db, logger) {
  let client

  try {
    client = await db.connect()
    logger.info(`Retrieving land parcels for parcelId:- ${parcelId}`)
    const query = 'SELECT * FROM land_parcels WHERE parcel_id = $1'
    const values = [parcelId]

    const result = await client.query(query, values)
    logger.info(
      `Retrieved land parcels for parcelId:-  ${parcelId}, ${result.rows}`
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
