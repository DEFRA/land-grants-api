/**
 * @import {Logger} from '~/src/api/common/logger.d.js'
 */

/**
 * Get a land data
 * @param {string} sheetId - The sheetId
 * @param {string} parcelId - The parcelId
 * @param {any} db - Database connection
 * @param {Logger} logger - Logger object
 * @returns {Promise<LandParcel[]>} The land data
 */
async function getLandData(sheetId, parcelId, db, logger) {
  let client

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
    return
  } finally {
    if (client) {
      client.release()
    }
  }
}
export { getLandData }

/**
 * @typedef {object} LandParcel
 * @property {number} id
 * @property {string} sheet_id
 * @property {string} parcel_id
 * @property {number} area_sqm
 * @property {string} geom
 * @property {Date} last_updated
 */
