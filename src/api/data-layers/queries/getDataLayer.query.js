import {
  logDatabaseError,
  logInfo
} from '~/src/api/common/helpers/logging/log-helpers.js'

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
  AND m.data_layer_type_id = 1
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
 * @param {object} db - The database connection
 * @param {object} logger - The logger
 * @returns {Promise<number>} The data layer query
 */
async function getDataLayerQuery(sheetId, parcelId, db, logger) {
  let client

  try {
    client = await db.connect()

    const values = [sheetId, parcelId]
    const result = await client.query(dataLayerQuery, values)

    if (result?.rows?.length === 0) {
      return 0
    }

    const roundedOverlapPercent = Math.max(
      ...(result.rows.map((row) => row.overlap_percent) || 0)
    )

    const roundedToTwoDecimals = parseFloat(roundedOverlapPercent.toFixed(2))

    logInfo(logger, {
      category: 'database',
      message: 'Get data layer query',
      context: {
        parcelId,
        sheetId,
        roundedOverlapPercent: roundedToTwoDecimals
      }
    })
    return roundedToTwoDecimals
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
