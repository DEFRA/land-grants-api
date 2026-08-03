import {
  logDatabaseError,
  logInfo
} from '~/src/features/common/helpers/logging/log-helpers.js'
import { roundSqm } from '~/src/features/common/helpers/measurement.js'

/**
 * Get available area of a land parcel excluding specified land cover classes.
 * @param {string} sheetId - Sheet ID of the parcel.
 * @param {string} parcelId - Parcel ID.
 * @param {object} db - DB connection object
 * @param {Logger} logger - logger object
 * @returns {Promise<LandCover[]>} Available area in square meters.
 * @throws {Error} Throws error if something goes wrong
 */
async function getLandCoversForParcel(sheetId, parcelId, db, logger) {
  let client
  try {
    client = await db.connect()

    const landCoversQuery = `
        SELECT
          lc.land_cover_class_code, ST_Area(lc.geom) AS area_sqm
        FROM land_covers lc
        WHERE lc.sheet_id = $1
          AND lc.parcel_id = $2
        ORDER BY lc.land_cover_class_code, lc.area_sqm
    `

    logInfo(logger, {
      category: 'database',
      message: 'Get land covers for parcel',
      context: {
        parcelId,
        sheetId
      }
    })

    const result = await client.query(landCoversQuery, [sheetId, parcelId])

    const landCovers = result.rows.map((row) => ({
      landCoverClassCode: row.land_cover_class_code,
      areaSqm: roundSqm(row.area_sqm)
    }))

    return landCovers
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get land covers for parcel',
      error,
      context: {
        parcelId,
        sheetId
      }
    })
    throw error
  } finally {
    if (client) {
      client.release()
    }
  }
}

export { getLandCoversForParcel }

/**
 * @import { LandCover } from '../parcel.d.js'
 * @import { Logger } from '../../common/logger.d.js'
 */
