import { startTiming, endTiming } from '~/src/api/common/helpers/performance.js'

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
  let success = true
  const start = startTiming()

  try {
    logger.info(
      `Connecting to DB to fetch info parcelId: ${sheetId}-${parcelId}`
    )
    client = await db.connect()
    logger.info(`Retrieving land parcels for parcelId: ${sheetId}-${parcelId}`)

    const query =
      'SELECT * FROM land_parcels WHERE sheet_id = $1 and parcel_id = $2'
    const values = [sheetId, parcelId]

    const result = await client.query(query, values)
    logger.info(
      `Retrieved land parcels for parcelId:  ${sheetId}-${parcelId}, items: ${result?.rows?.length}`
    )

    return result.rows
  } catch (error) {
    logger.error(`Error executing get Land parcels query: ${error}`)
    success = false
    return
  } finally {
    if (client) {
      client.release()
    }
    endTiming(logger, 'getLandData', start, success)
  }
}
export { getLandData }
