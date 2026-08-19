import {
  logDatabaseError,
  logInfo
} from '~/src/features/common/helpers/logging/log-helpers.js'
import { roundSqm } from '~/src/features/common/helpers/measurement.js'

const LFA_REF_CODES = ['D', 'S', 'M', 'MS', 'MD']

async function getLfaInterceptPercentage(sheetId, parcelId, db, logger) {
  let client

  try {
    client = await db.connect()
    const query = `
      WITH parcel AS (
        SELECT geom FROM land_parcels WHERE sheet_id = $1 AND parcel_id = $2
      ),
      lfa_union AS (
        SELECT ST_Union(m.geom) AS union_geom
        FROM data_layer m
        JOIN parcel p ON ST_Intersects(p.geom, m.geom)
        WHERE m.data_layer_type_id = 2
          AND m.metadata->>'ref_code' = ANY($3)
      )
      SELECT
        COALESCE(ST_Area(ST_Intersection(p.geom, u.union_geom))::float8, 0)
            / NULLIF(ST_Area(p.geom)::float8, 0) * 100 AS overlap_percent
      FROM parcel p
      LEFT JOIN lfa_union u ON true
    `

    const values = [sheetId, parcelId, LFA_REF_CODES]
    const result = await client.query(query, values)

    if (result?.rows?.length === 0) {
      return 0
    }

    const roundedLfaOverlapPercent = roundSqm(
      result.rows[0]?.overlap_percent || 0
    )

    logInfo(logger, {
      category: 'database',
      message: 'Get LFA intercept percentage',
      context: {
        parcelId,
        sheetId,
        roundedLfaOverlapPercent
      }
    })
    return roundedLfaOverlapPercent
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get LFA intercept percentage',
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

export { getLfaInterceptPercentage }
