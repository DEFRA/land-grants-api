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

const dataLayerQuery = `
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
/**
 * Get the data layer query
 * @param {string} sheetId - The sheet id
 * @param {string} parcelId - The parcel id
 * @param {number} dataLayerTypeId - The data layer type id
 * @param {object} db - The database connection
 * @param {object} logger - The logger
 * @returns {Promise<object>} The data layer query
 */
async function getDataLayerQuery(
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
    const result = await client.query(dataLayerQuery, values)

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

export { getDataLayerQuery, dataLayerQuery }
