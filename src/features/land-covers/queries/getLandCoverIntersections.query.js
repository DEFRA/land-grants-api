import {
  logDatabaseError,
  logInfo
} from '~/src/features/common/helpers/logging/log-helpers.js'

export const getIntersectionsExclusiveQuery = `
  WITH target_parcel AS (
    SELECT geom
    FROM land_parcels
    WHERE sheet_id = $1
      AND parcel_id = $2
  ),
  parcel_land_covers AS (
    SELECT
      lc.land_cover_class_code,
      ST_Intersection(lc.geom, p.geom) AS geom
    FROM land_covers lc
    JOIN target_parcel p
      ON ST_Intersects(lc.geom, p.geom)
    WHERE lc.sheet_id = $1
      AND lc.parcel_id = $2
  ),
  sssi_union AS (
    SELECT ST_Union(ST_Intersection(dl.geom, p.geom)) AS geom
    FROM data_layer dl
    JOIN target_parcel p
      ON ST_Intersects(dl.geom, p.geom)
    WHERE dl.data_layer_type_id = 1
  ),
  hf_union AS (
    SELECT ST_Union(ST_Intersection(dl.geom, p.geom)) AS geom
    FROM data_layer dl
    JOIN target_parcel p
      ON ST_Intersects(dl.geom, p.geom)
    WHERE dl.data_layer_type_id = 3
  ),
  designation_geoms AS (
    SELECT
      s.geom AS sssi_geom,
      h.geom AS hf_geom,
      CASE
        WHEN s.geom IS NOT NULL AND h.geom IS NOT NULL
          THEN ST_Intersection(s.geom, h.geom)
        ELSE NULL
      END AS both_geom,
      CASE
        WHEN s.geom IS NOT NULL AND h.geom IS NOT NULL
          THEN ST_Difference(s.geom, h.geom)
        ELSE s.geom
      END AS sssi_only_geom,
      CASE
        WHEN s.geom IS NOT NULL AND h.geom IS NOT NULL
          THEN ST_Difference(h.geom, s.geom)
        ELSE h.geom
      END AS hf_only_geom
    FROM sssi_union s
    CROSS JOIN hf_union h
  ),
  overlap_rows AS (
    SELECT
      plc.land_cover_class_code,
      'sssi_only' AS overlap_type,
      COALESCE(
        ST_Area(ST_Intersection(plc.geom, dg.sssi_only_geom))::float8,
        0
      ) AS area_sqm
    FROM parcel_land_covers plc
    CROSS JOIN designation_geoms dg

    UNION ALL

    SELECT
      plc.land_cover_class_code,
      'hf_only' AS overlap_type,
      COALESCE(
        ST_Area(ST_Intersection(plc.geom, dg.hf_only_geom))::float8,
        0
      ) AS area_sqm
    FROM parcel_land_covers plc
    CROSS JOIN designation_geoms dg

    UNION ALL

    SELECT
      plc.land_cover_class_code,
      'sssi_and_hf' AS overlap_type,
      COALESCE(
        ST_Area(ST_Intersection(plc.geom, dg.both_geom))::float8,
        0
      ) AS area_sqm
    FROM parcel_land_covers plc
    CROSS JOIN designation_geoms dg
  )
  SELECT
    land_cover_class_code,
    overlap_type,
    SUM(area_sqm) AS area_sqm
  FROM overlap_rows
  WHERE area_sqm > 0
  GROUP BY land_cover_class_code, overlap_type
  ORDER BY land_cover_class_code, overlap_type
`

/**
 * Get SSSI/HF intersections grouped by land cover class.
 * @param {string} sheetId - The parcel sheet id.
 * @param {string} parcelId - The parcel id.
 * @param {Pool} db - The database pool.
 * @param {Logger} logger - The logger instance.
 * @returns {Promise<{sssiOverlap: DesignationOverlap[], hfOverlap: DesignationOverlap[], sssiAndHfOverlap: DesignationOverlap[]}>} Intersections grouped for AAC.
 */
export async function getLandCoverIntersections(sheetId, parcelId, db, logger) {
  let client

  try {
    client = await db.connect()

    const result = await client.query(getIntersectionsExclusiveQuery, [
      sheetId,
      parcelId
    ])

    const sssiOverlap = []
    const hfOverlap = []
    const sssiAndHfOverlap = []

    for (const row of result.rows ?? []) {
      const overlap = {
        landCoverClassCode: row.land_cover_class_code,
        areaSqm: Number(row.area_sqm)
      }

      if (row.overlap_type === 'sssi_only') {
        sssiOverlap.push(overlap)
      } else if (row.overlap_type === 'hf_only') {
        hfOverlap.push(overlap)
      } else if (row.overlap_type === 'sssi_and_hf') {
        sssiAndHfOverlap.push(overlap)
      }
    }

    logInfo(logger, {
      category: 'database',
      message: 'Get parcel designation intersections',
      context: {
        parcelId,
        sheetId,
        rowCount: result.rows?.length ?? 0
      }
    })

    return {
      sssiOverlap,
      hfOverlap,
      sssiAndHfOverlap
    }
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get land cover intersections',
      error,
      context: {
        parcelId,
        sheetId
      }
    })

    return {
      sssiOverlap: [],
      hfOverlap: [],
      sssiAndHfOverlap: []
    }
  } finally {
    if (client) {
      client.release()
    }
  }
}

/**
 * @import { Pool } from '~/src/features/common/postgres.d.js'
 * @import { Logger } from '~/src/features/common/logger.d.js'
 * @import { DesignationOverlap } from '~/src/features/available-area/available-area.d.js'
 */
