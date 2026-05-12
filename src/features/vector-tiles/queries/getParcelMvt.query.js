import { logDatabaseError } from '~/src/features/common/helpers/logging/log-helpers.js'

const MVT_EXTENT = 4096
const MVT_BUFFER = 64
const SOURCE_SRID = 27700
const TILE_SRID = 3857

const sql = `
WITH tile AS (
  SELECT ST_TileEnvelope($3, $4, $5) AS env_3857
),
keys AS (
  SELECT * FROM unnest($1::text[], $2::text[]) AS t(sheet_id, parcel_id)
),
mvtgeom AS (
  SELECT
    ST_AsMVTGeom(
      ST_Transform(p.geom, ${TILE_SRID}),
      tile.env_3857,
      ${MVT_EXTENT}, ${MVT_BUFFER}, true
    ) AS geom,
    p.sheet_id,
    p.parcel_id
  FROM land_parcels p
  JOIN keys k ON p.sheet_id = k.sheet_id AND p.parcel_id = k.parcel_id
  CROSS JOIN tile
  WHERE p.geom && ST_Transform(tile.env_3857, ${SOURCE_SRID})
)
SELECT COALESCE(ST_AsMVT(mvtgeom.*, 'parcels', ${MVT_EXTENT}, 'geom'), ''::bytea) AS tile
FROM mvtgeom
WHERE geom IS NOT NULL
`

/**
 * Build a Mapbox Vector Tile for the requested parcels.
 * @param {object} params
 * @param {number} params.z
 * @param {number} params.x
 * @param {number} params.y
 * @param {string[]} params.sheetIds
 * @param {string[]} params.parcelKeys
 * @param {Pool} db
 * @param {Logger} logger
 * @returns {Promise<Buffer>} MVT bytes (empty buffer when no parcels intersect)
 */
export async function getParcelMvt(
  { z, x, y, sheetIds, parcelKeys },
  db,
  logger
) {
  let client
  try {
    client = await db.connect()
    const result = await client.query(sql, [sheetIds, parcelKeys, z, x, y])
    const tile = result.rows[0]?.tile
    if (!tile) {
      return Buffer.alloc(0)
    }
    return Buffer.isBuffer(tile) ? tile : Buffer.from(tile)
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get parcel vector tile',
      error,
      context: { z, x, y, idCount: sheetIds.length }
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
