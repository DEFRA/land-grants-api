import { logDatabaseError } from '~/src/features/common/helpers/logging/log-helpers.js'
import {
  BNG_SRID,
  WGS84_LAT_LONG_SRID
} from '~/src/features/vector-tiles/constants/coordinate-systems.js'

const sql = `
WITH keys AS (
  SELECT * FROM unnest($1::text[], $2::text[]) AS t(sheet_id, parcel_id)
),
-- Ingested rows carry no SRID and ST_Transform rejects SRID 0, so declare it
-- here (repairing the data so the column carries its own SRID is outstanding).
matched AS (
  SELECT ST_Transform(
    ST_SetSRID(p.geom, ${BNG_SRID}),
    ${WGS84_LAT_LONG_SRID}
  ) AS geom_wgs84
  FROM land_parcels p
  JOIN keys k ON p.sheet_id = k.sheet_id AND p.parcel_id = k.parcel_id
),
extent AS (
  SELECT ST_Extent(geom_wgs84) AS env FROM matched
)
SELECT
  (SELECT COUNT(*)::int FROM matched) AS found_count,
  ST_XMin(extent.env)                 AS min_lng,
  ST_YMin(extent.env)                 AS min_lat,
  ST_XMax(extent.env)                 AS max_lng,
  ST_YMax(extent.env)                 AS max_lat
FROM extent
`

/**
 * Get the WGS84 (EPSG:4326) bounding box that contains the union of the
 * requested parcels' geometries.
 * @param {object} params
 * @param {string[]} params.sheetIds
 * @param {string[]} params.parcelKeys
 * @param {Pool} db
 * @param {Logger} logger
 * @returns {Promise<{ foundCount: number, bbox: { minLng: number, minLat: number, maxLng: number, maxLat: number } | null }>}
 */
export async function getParcelExtent({ sheetIds, parcelKeys }, db, logger) {
  let client
  try {
    client = await db.connect()
    const result = await client.query(sql, [sheetIds, parcelKeys])
    const row = result.rows[0]
    if (!row || row.found_count === 0) {
      return { foundCount: 0, bbox: null }
    }
    return {
      foundCount: row.found_count,
      bbox: {
        minLng: Number(row.min_lng),
        minLat: Number(row.min_lat),
        maxLng: Number(row.max_lng),
        maxLat: Number(row.max_lat)
      }
    }
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get parcel extent',
      error,
      context: { idCount: sheetIds.length }
    })
    throw error
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
