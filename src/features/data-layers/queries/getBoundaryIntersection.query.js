import {
  logDatabaseError,
  logInfo
} from '~/src/features/common/helpers/logging/log-helpers.js'

export { DATA_LAYER_TYPES } from './getDataLayer.query.js'

// Clip the boundary to each feature before unioning, as getIntersectPercentage does:
// unioning the full polygons first is slower and loses coincident stretches of boundary
const boundaryIntersectionQuery = `
  WITH parcel AS (
    SELECT geom FROM land_parcels WHERE sheet_id = $1 AND parcel_id = $2
  ),
  boundary_fragments AS (
    SELECT ST_Union(ST_Intersection(ST_Boundary(p.geom), m.geom)) AS geom
    FROM data_layer m
    JOIN parcel p ON ST_Intersects(p.geom, m.geom)
    WHERE m.data_layer_type_id = $3
  )
  SELECT
    round(ST_Perimeter(p.geom)) AS boundary_length_meters,
    COALESCE(round(ST_Length(f.geom)), 0) AS intersecting_length_meters
  FROM parcel p
  LEFT JOIN boundary_fragments f ON true
`

/**
 * Measures how much of a parcel's boundary lies inside a data layer
 * @param {string} sheetId - The sheet id
 * @param {string} parcelId - The parcel id
 * @param {number} dataLayerTypeId - The data layer type id
 * @param {Pool} db - Database connection
 * @param {Logger} logger - Logger object
 * @returns {Promise<BoundaryIntersection | null>} Integer metres, or null if the parcel is not found or the query fails
 */
async function getBoundaryIntersection(
  sheetId,
  parcelId,
  dataLayerTypeId,
  db,
  logger
) {
  let client

  try {
    client = await db.connect()

    const values = [sheetId, parcelId, dataLayerTypeId]
    const result = await client.query(boundaryIntersectionQuery, values)

    if (result.rows.length !== 1) {
      throw new Error('Land parcel not found')
    }

    const {
      intersecting_length_meters: intersectingLengthMeters,
      boundary_length_meters: boundaryLengthMeters
    } = result.rows[0]

    logInfo(logger, {
      category: 'database',
      message: 'Get boundary intersection',
      context: {
        sheetId,
        parcelId,
        dataLayerTypeId,
        intersectingLengthMeters,
        boundaryLengthMeters
      }
    })

    return { intersectingLengthMeters, boundaryLengthMeters }
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get boundary intersection',
      error,
      context: {
        sheetId,
        parcelId,
        dataLayerTypeId
      }
    })
    return null
  } finally {
    if (client) {
      client.release()
    }
  }
}

export { getBoundaryIntersection }

/**
 * @import {BoundaryIntersection} from '~/src/features/data-layers/data-layers.d.js'
 * @import {Logger} from '~/src/features/common/logger.d.js'
 * @import {Pool} from '~/src/features/common/postgres.d.js'
 */
