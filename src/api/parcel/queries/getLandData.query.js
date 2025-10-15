/**
 * @import {Logger} from '~/src/api/common/logger.d.js'
 * @import {LandParcel} from '~/src/api/parcel/parcel.d.js'
 */

import { roundSqm } from '../../common/helpers/measurement.js'

/**
 * Get a land data
 * @param {string} sheetId - The sheetId
 * @param {string} parcelId - The parcelId
 * @param {any} db - Database connection
 * @param {Logger} logger - Logger object
 * @returns {Promise<LandParcel | null>} The land data
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

    if (result?.rows?.length === 0) {
      return null
    }

    return {
      id: result.rows[0].id,
      areaSqm: roundSqm(result.rows[0].area_sqm),
      sheetId: result.rows[0].sheet_id,
      parcelId: result.rows[0].parcel_id,
      geom: result.rows[0].geom
    }
  } catch (error) {
    logger.error(`Error executing get Land parcels query: ${error}`)
    return null
  } finally {
    if (client) {
      client.release()
    }
  }
}
export { getLandData }
