import {
  logDatabaseError,
  logInfo
} from '~/src/features/common/helpers/logging/log-helpers.js'
import { sqmToHaRounded } from '~/src/features/common/helpers/measurement.js'

export const DATA_LAYER_TYPES = {
  sssi: 1,
  less_favoured_areas: 2,
  historic_features: 3
}

export const DATA_LAYER_QUERY_TYPES = {
  accumulated: 'accumulated',
  union: 'union'
}

export const accumulatedIntersectionAreaQuery = `
  SELECT
    COALESCE(SUM(ST_Area(ST_Intersection(p.geom, m.geom))::float8), 0) as sqm,
      COALESCE(SUM(ST_Area(ST_Intersection(p.geom, m.geom))::float8), 0)
          / NULLIF(ST_Area(p.geom)::float8, 0) * 100 AS overlap_percent
  FROM
      land_parcels p
  LEFT JOIN
      data_layer m
      ON ST_Intersects(p.geom, m.geom)
  AND m.data_layer_type_id = $3
  WHERE
      p.sheet_id = $1 AND
      p.parcel_id = $2
  GROUP BY
      p.geom
`

export const unionIntersectionAreaQuery = `
    WITH parcel AS (
    SELECT geom FROM land_parcels WHERE sheet_id = $1 AND parcel_id = $2
  ),
  data_layer_union AS (
    SELECT ST_Union(m.geom) AS union_geom
    FROM data_layer m
    JOIN parcel p ON ST_Intersects(p.geom, m.geom)
    WHERE m.data_layer_type_id = $3
  )
  SELECT
    COALESCE(ST_Area(ST_Intersection(p.geom, u.union_geom))::float8, 0) AS sqm,
    COALESCE(ST_Area(ST_Intersection(p.geom, u.union_geom))::float8, 0)
      / NULLIF(ST_Area(p.geom)::float8, 0) * 100 AS overlap_percent
  FROM parcel p
  LEFT JOIN data_layer_union u ON true
`

/**
 * Get the accumulated data layer query
 * @param {string} sheetId - The sheet id
 * @param {string} parcelId - The parcel id
 * @param {number} dataLayerTypeId - The data layer type id
 * @param {object} db - The database connection
 * @param {object} logger - The logger
 * @returns {Promise<object>} The data layer query
 */
export async function getDataLayerQueryAccumulated(
  sheetId,
  parcelId,
  dataLayerTypeId,
  db,
  logger
) {
  return getDataLayerQuery(
    sheetId,
    parcelId,
    dataLayerTypeId,
    accumulatedIntersectionAreaQuery,
    db,
    logger
  )
}

/**
 * Get the union data layer query
 * @param {string} sheetId - The sheet id
 * @param {string} parcelId - The parcel id
 * @param {number} dataLayerTypeId - The data layer type id
 * @param {object} db - The database connection
 * @param {object} logger - The logger
 * @returns {Promise<object>} The data layer query
 */
export async function getDataLayerQueryUnion(
  sheetId,
  parcelId,
  dataLayerTypeId,
  db,
  logger
) {
  return getDataLayerQuery(
    sheetId,
    parcelId,
    dataLayerTypeId,
    unionIntersectionAreaQuery,
    db,
    logger
  )
}

/**
 * Get the data layer query
 * @param {string} sheetId - The sheet id
 * @param {string} parcelId - The parcel id
 * @param {number} dataLayerTypeId - The data layer type id
 * @param {string} query - The query
 * @param {object} db - The database connection
 * @param {object} logger - The logger
 * @returns {Promise<object>} The data layer query
 */
async function getDataLayerQuery(
  sheetId,
  parcelId,
  dataLayerTypeId,
  query,
  db,
  logger
) {
  let client

  try {
    client = await db.connect()

    const values = [sheetId, parcelId, dataLayerTypeId]
    const result = await client.query(query, values)

    if (result?.rows?.length === 0) {
      return 0
    }

    const roundedOverlapPercent = Math.max(
      ...(result.rows.map((row) => row.overlap_percent) || 0)
    )

    const roundedOverlapPercentToTwoDecimals = Number.parseFloat(
      roundedOverlapPercent.toFixed(2)
    )

    const intersectionAreaSqm = Math.max(
      ...(result.rows.map((row) => row.sqm) || 0)
    )

    logInfo(logger, {
      category: 'database',
      message: 'Get data layer query',
      context: {
        parcelId,
        sheetId,
        roundedOverlapPercent: roundedOverlapPercentToTwoDecimals,
        intersectionAreaHa: sqmToHaRounded(intersectionAreaSqm)
      }
    })

    return {
      intersectingAreaPercentage: roundedOverlapPercentToTwoDecimals,
      intersectionAreaHa: sqmToHaRounded(intersectionAreaSqm)
    }
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get data layer query',
      error,
      context: {
        parcelId,
        sheetId
      }
    })
    return 0
  } finally {
    if (client) {
      client.release()
    }
  }
}
