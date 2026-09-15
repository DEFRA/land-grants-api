import { logDatabaseError } from '~/src/features/common/helpers/logging/log-helpers.js'

/**
 * Get a land data
 * @param {string} sheetId - The sheetId
 * @param {string} parcelId - The parcelId
 * @param {Pool} db - Database connection
 * @param {Logger} logger - Logger object
 * @returns {Promise<string[] | null>} The land data
 */
export async function getLandUseCodesForParcel(sheetId, parcelId, db, logger) {
  let client

  try {
    client = await db.connect()
    const query = `SELECT DISTINCT
        cc.land_use_code
    FROM
    land_covers c
    INNER JOIN land_cover_codes cc ON cc.land_cover_class_code = c.land_cover_class_code
    WHERE
        c.sheet_id = $1
    AND c.parcel_id = $2`
    const values = [sheetId, parcelId]

    const result = await client.query(query, values)

    return result.rows.map((row) => row.land_use_code)
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get land use codes for parcel',
      error
    })
    return null
  } finally {
    if (client) {
      client.release()
    }
  }
}

/**
 * @import {Logger} from '~/src/features/common/logger.d.js'
 * @import {Pool} from '~/src/features/common/postgres.d.js'
 */
