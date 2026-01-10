import {
  logDatabaseError,
  logInfo
} from '~/src/api/common/helpers/logging/log-helpers.js'
import { roundSqm } from '~/src/api/common/helpers/measurement.js'

async function getDataLayerQuery(sheetId, parcelId, db, logger) {
  let client

  try {
    client = await db.connect()
    const query = `
      SELECT
          COALESCE(SUM(ST_Area(ST_Intersection(p.geom, d.geom))::float8), 0)
              / NULLIF(ST_Area(p.geom)::float8, 0) * 100 AS overlap_percent
      FROM
          land_parcels p
      LEFT JOIN
          data_layer d
          ON ST_Intersects(p.geom, d.geom)
      WHERE
          p.sheet_id = $1 AND
          p.parcel_id = $2
      GROUP BY
          p.sheet_id, p.parcel_id, p.geom;
    `

    const values = [sheetId, parcelId]
    const result = await client.query(query, values)

    if (result?.rows?.length === 0) {
      return 0
    }

    const roundedOverlapPercent = Math.max(
      ...(result.rows.map((row) => roundSqm(row.overlap_percent || 0)) || 0)
    )

    logInfo(logger, {
      category: 'database',
      message: 'Get data layer query',
      context: {
        parcelId,
        sheetId,
        roundedOverlapPercent
      }
    })
    return roundedOverlapPercent
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

export { getDataLayerQuery }
