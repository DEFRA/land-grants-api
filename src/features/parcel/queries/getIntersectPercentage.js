import {
  logDatabaseError,
  logInfo
} from '~/src/features/common/helpers/logging/log-helpers.js'

async function getIntersectPercentage(
  { sheetId, parcelId, refCodes, dataLayerType, operationName },
  db,
  logger
) {
  let client

  try {
    client = await db.connect()
    // Calculate what percentage of a parcel's area overlaps with a data layer.
    // 1. Find the parcel geometry
    // 2. Clip each matching data layer geometry to the parcel first, so
    //    ST_Union only ever combines small clipped fragments rather than the
    //    full (often huge, high-vertex) source geometries - clipping before
    //    unioning avoids a major perf regression seen with large layers (e.g. LFA)
    // 3. Union the clipped fragments (avoids double-counting overlapping zones)
    //    and divide by total parcel area
    // 4. LEFT JOIN ensures parcels with no overlap return 0% rather than no row
    const query = `
      WITH parcel AS (
        SELECT geom FROM land_parcels WHERE sheet_id = $1 AND parcel_id = $2
      ),
      dl_clipped AS (
        SELECT ST_Intersection(p.geom, dl.geom) AS geom
        FROM data_layer dl
        JOIN parcel p ON ST_Intersects(p.geom, dl.geom)
        WHERE dl.data_layer_type_id = $4
          AND dl.metadata->>'ref_code' = ANY($3)
      ),
      dl_union AS (
        SELECT ST_Union(geom) AS union_geom FROM dl_clipped
      )
      SELECT
        COALESCE(ST_Area(u.union_geom)::float8, 0)
            / NULLIF(ST_Area(p.geom)::float8, 0) * 100 AS overlap_percent
      FROM parcel p
      LEFT JOIN dl_union u ON true
    `

    const values = [sheetId, parcelId, refCodes, dataLayerType]
    const result = await client.query(query, values)

    const roundedOverlapPercent = Math.round(
      result.rows[0]?.overlap_percent || 0
    )

    logInfo(logger, {
      category: 'database',
      message: operationName,
      context: {
        parcelId,
        sheetId,
        roundedOverlapPercent
      }
    })
    return roundedOverlapPercent
  } catch (error) {
    logDatabaseError(logger, {
      operation: operationName,
      error,
      context: {
        parcelId,
        sheetId
      }
    })
    return null
  } finally {
    if (client) {
      client.release()
    }
  }
}

export { getIntersectPercentage }
