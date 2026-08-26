import { logDatabaseError } from '~/src/features/common/helpers/logging/log-helpers.js'

/**
 * Gets the boundary of a land parcel
 * @param {string} sheetId - The sheetId
 * @param {string} parcelId - The parcelId
 * @param {Pool} db - Database connection
 * @param {Logger} logger - Logger object
 * @returns {Promise<LandParcelBoundary | null>} The land data
 */
async function getLandParcelBoundary(sheetId, parcelId, db, logger) {
  let client

  try {
    client = await db.connect()
    const query = `SELECT
        round(ST_Perimeter(geom)) as boundary_length_meters
      FROM land_parcels
      WHERE sheet_id = $1 and parcel_id = $2`
    const values = [sheetId, parcelId]

    const result = await client.query(query, values)

    if (result.rows.length !== 1) {
      throw new Error('Land parcel not found')
    }

    return {
      boundaryLengthMeters: result.rows[0].boundary_length_meters
    }
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get the boundary for parcel',
      error
    })
    return null
  } finally {
    if (client) {
      client.release()
    }
  }
}
export { getLandParcelBoundary }

/**
 * @import {Logger} from '~/src/features/common/logger.d.js'
 * @import {LandParcelBoundary} from '~/src/features/parcel/parcel.d.js'
 * @import {Pool} from '~/src/features/common/postgres.d.js'
 */
