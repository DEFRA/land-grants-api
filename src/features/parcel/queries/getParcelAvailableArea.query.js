import {
  logDatabaseError,
  logInfo
} from '~/src/features/common/helpers/logging/log-helpers.js'
import { roundSqm } from '~/src/features/common/helpers/measurement.js'

/**
 * Get available area of a land parcel excluding specified land cover classes.
 * @param {string} sheetId - Sheet ID of the parcel.
 * @param {string} parcelId - Parcel ID.
 * @param {string[]} landCoverClassCodes - Array of land cover class codes to exclude.
 * @param {Pool} db - DB connection object
 * @param {Logger} logger - logger object
 * @returns {Promise<number>} Available area in square meters.
 */
async function getParcelAvailableArea(
  sheetId,
  parcelId,
  landCoverClassCodes,
  db,
  logger
) {
  let client
  try {
    client = await db.connect()

    const avaialbleAreaCalculationQuery = `WITH target_parcel AS (
        SELECT geom
        FROM land_parcels
        WHERE sheet_id = $1
          AND parcel_id = $2
    ),
    intersected_land_covers AS (
        SELECT
          ST_Intersection(lc.geom, p.geom) AS clipped_geom
        FROM land_covers lc
        JOIN target_parcel p
          ON ST_Intersects(lc.geom, p.geom)
        WHERE lc.sheet_id = $1
          AND lc.parcel_id = $2
          AND lc.land_cover_class_code = ANY($3)
    ),
    unioned_geom AS (
        SELECT ST_Union(clipped_geom) AS merged_geom
        FROM intersected_land_covers
    )
    SELECT ST_Area(merged_geom) AS total_land_cover_area
    FROM unioned_geom
    `

    const result = await client.query(avaialbleAreaCalculationQuery, [
      sheetId,
      parcelId,
      landCoverClassCodes
    ])

    const totalLandCoverArea = result?.rows[0]?.total_land_cover_area || 0

    logInfo(logger, {
      category: 'database',
      message: 'Get parcel available area',
      context: {
        parcelId,
        sheetId,
        totalLandCoverArea
      }
    })

    const roundedTotalLandCoverArea = roundSqm(totalLandCoverArea)

    return roundedTotalLandCoverArea
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get parcel available area',
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

export { getParcelAvailableArea }

/**
 * @import {Pool} from '~/src/features/common/postgres.d.js'
 * @import {Logger} from '~/src/features/common/logger.d.js'
 */
