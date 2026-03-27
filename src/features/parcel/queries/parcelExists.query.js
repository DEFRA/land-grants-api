import { logDatabaseError } from '~/src/features/common/helpers/logging/log-helpers.js'
import { roundSqm } from '~/src/features/common/helpers/measurement.js'

/**
 * Get a land data
 * @param {{sheetId: string, parcelId: string}[]} parcelIds - The sheetId
 * @param {Pool} db - Database connection
 * @param {Logger} logger - Logger object
 * @returns {Promise<LandParcelDb[] | null>} The land data
 */
async function checkParcelsExist(parcelIds, db, logger) {
  let client

  try {
    client = await db.connect()
    const query = {
      name: 'parcel-exists',
      text: `select exists (
            SELECT 1 FROM land_parcels WHERE sheet_id = $1
            AND parcel_id = $2
      )`,
      values: parcelIds,
      rowMode: 'array'
    }

    const result = await client.query(query)

    return result.rows.map((row) => ({
      ...row,
      area: roundSqm(row.area_sqm)
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
 * @import {Logger} from '~/src/features/common/logger.d.js'
 * @import {LandParcelDb} from '~/src/features/parcel/parcel.d.js'
 * @import {Pool} from '~/src/features/common/postgres.d.js'
 */
