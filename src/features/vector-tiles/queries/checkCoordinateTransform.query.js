import { logDatabaseError } from '~/src/features/common/helpers/logging/log-helpers.js'
import {
  BNG_SRID,
  WGS84_LAT_LONG_SRID
} from '~/src/features/vector-tiles/constants/coordinate-systems.js'

const sql = `
WITH transformed AS (
  SELECT ST_Transform(
    ST_SetSRID(ST_MakePoint($1, $2), ${BNG_SRID}),
    ${WGS84_LAT_LONG_SRID}
  ) AS geom
)
SELECT ST_X(geom) AS lng, ST_Y(geom) AS lat FROM transformed
`

/**
 * Transform a British National Grid point to WGS84, so the caller can compare
 * the result against a known-good reference.
 * @param {object} params
 * @param {number} params.easting
 * @param {number} params.northing
 * @param {Pool} db
 * @param {Logger} logger
 * @returns {Promise<{ lng: number, lat: number }>}
 */
export async function checkCoordinateTransform(
  { easting, northing },
  db,
  logger
) {
  let client
  try {
    client = await db.connect()
    const result = await client.query(sql, [easting, northing])
    const row = result.rows[0]
    return { lng: Number(row.lng), lat: Number(row.lat) }
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Check coordinate transform',
      error,
      context: { easting, northing }
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
