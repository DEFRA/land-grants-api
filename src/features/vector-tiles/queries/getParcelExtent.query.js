import { logDatabaseError } from '~/src/features/common/helpers/logging/log-helpers.js'

const SOURCE_SRID = 27700
const TILE_SRID = 3857

const sql = `
WITH keys AS (
  SELECT * FROM unnest($1::text[], $2::text[]) AS t(sheet_id, parcel_id)
),
-- ~3% of parcels have geom SRID=0 although the coords are BNG. Force the
-- expected SRID so ST_Transform works for them too (same workaround as
-- getParcelMvt.query.js).
matched AS (
  SELECT ST_Transform(ST_SetSRID(p.geom, ${SOURCE_SRID}), ${TILE_SRID}) AS geom_3857
  FROM land_parcels p
  JOIN keys k ON p.sheet_id = k.sheet_id AND p.parcel_id = k.parcel_id
),
extent AS (
  SELECT ST_Extent(geom_3857) AS env FROM matched
)
SELECT
  (SELECT COUNT(*)::int FROM matched) AS found_count,
  ST_XMin(extent.env)                 AS xmin,
  ST_YMin(extent.env)                 AS ymin,
  ST_XMax(extent.env)                 AS xmax,
  ST_YMax(extent.env)                 AS ymax
FROM extent
`

/**
 * Get the Web Mercator (EPSG:3857) bounding box that contains the union of
 * the requested parcels' geometries.
 * @param {object} params
 * @param {string[]} params.sheetIds
 * @param {string[]} params.parcelKeys
 * @param {Pool} db
 * @param {Logger} logger
 * @returns {Promise<{ foundCount: number, bbox: { xmin: number, ymin: number, xmax: number, ymax: number } | null }>}
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
        xmin: Number(row.xmin),
        ymin: Number(row.ymin),
        xmax: Number(row.xmax),
        ymax: Number(row.ymax)
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
