import {
  logDatabaseError,
  logInfo
} from '~/src/api/common/helpers/logging/log-helpers.js'
import { roundSqm } from '~/src/api/common/helpers/measurement.js'

async function getMoorlandInterceptPercentage(sheetId, parcelId, db, logger) {
  let client

  try {
    client = await db.connect()
    const query = `
      SELECT
          COALESCE(SUM(ST_Area(ST_Intersection(p.geom, m.geom))::float8), 0)
              / NULLIF(ST_Area(p.geom)::float8, 0) * 100 AS moorland_overlap_percent
      FROM
          land_parcels p
      LEFT JOIN
          moorland_designations m
          ON ST_Intersects(p.geom, m.geom)
      WHERE
          p.sheet_id = $1 AND
          p.parcel_id = $2 AND
          m.ref_code LIKE 'M%'
      GROUP BY
          p.sheet_id, p.parcel_id, p.geom, m.ref_code;
    `

    const values = [sheetId, parcelId]
    const result = await client.query(query, values)

    if (result?.rows?.length === 0) {
      return 0
    }

    const roundedMoorlandOverlapPercent = Math.max(
      ...(result.rows.map((row) =>
        roundSqm(row.moorland_overlap_percent || 0)
      ) || 0)
    )

    logInfo(logger, {
      category: 'database',
      message: 'Get moorland intercept percentage',
      context: {
        parcelId,
        sheetId,
        roundedMoorlandOverlapPercent
      }
    })
    return roundedMoorlandOverlapPercent
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get moorland intercept percentage',
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

export { getMoorlandInterceptPercentage }
