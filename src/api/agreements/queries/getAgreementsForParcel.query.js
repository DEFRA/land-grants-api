/**
 * Get agreements for a parcel
 * @param {string} sheetId - The sheetId
 * @param {string} parcelId - The parcelId
 * @param {{object}} db connection
 * @param {{object}} logger object
 * @returns {object} The agreements
 */
async function getAgreementsForParcel(sheetId, parcelId, db, logger) {
  let client

  try {
    logger.info(
      `Connecting to DB to fetch agreements for parcelId: ${sheetId}-${parcelId}`
    )
    client = await db.connect()
    logger.info(`Retrieving agreements for parcelId: ${sheetId}-${parcelId}`)

    const query =
      'SELECT * FROM agreements WHERE sheet_id = $1 and parcel_id = $2'
    const values = [sheetId, parcelId]

    const result = await client.query(query, values)
    logger.info(
      `Retrieved agreements for parcelId:  ${sheetId}-${parcelId}, items: ${result?.rows?.length}`
    )

    return result.rows
  } catch (error) {
    logger.error(`Error executing get agreements query: ${error}`)
    return
  } finally {
    if (client) {
      client.release()
    }
  }
}
export { getAgreementsForParcel }
