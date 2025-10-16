import {
  logDatabaseError,
  logInfo
} from '~/src/api/common/helpers/logging/log-helpers.js'
import { roundSqm } from '~/src/api/common/helpers/measurement.js'

/**
 * Get a land data
 * @param {string} sheetId - The sheetId
 * @param {string} parcelId - The parcelId
 * @param {Pool} db - Database connection
 * @param {Logger} logger - Logger object
 * @returns {Promise<LandParcelDb[] | null>} The land data
 */
async function getLandData(sheetId, parcelId, db, logger) {
  let client

  try {
    client = await db.connect()
    const query =
      'SELECT * FROM land_parcels WHERE sheet_id = $1 and parcel_id = $2'
    const values = [sheetId, parcelId]

    const result = await client.query(query, values)
    logInfo(logger, {
      category: 'database',
      operation: 'Get land data for parcel',
      reference: `parcelId:${parcelId}, sheetId:${sheetId}, items:${result?.rows?.length}`
    })

    return result.rows.map((row) => ({
      ...row,
      area: roundSqm(row.area)
    }))
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get land data for parcel',
      error
    })
    return null
  } finally {
    if (client) {
      client.release()
    }
  }
}
export { getLandData }

/**
 * @import {Logger} from '~/src/api/common/logger.d.js'
 * @import {LandParcelDb} from '~/src/api/parcel/parcel.d.js'
 * @import {Pool} from '~/src/api/common/postgres.d.js'
 */
