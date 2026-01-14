import {
  logDatabaseError,
  logInfo
} from '~/src/api/common/helpers/logging/log-helpers.js'
import { roundSqm } from '~/src/api/common/helpers/measurement.js'

const dataLayerQuery = `
  SELECT
      COALESCE(SUM(ST_Area(ST_Intersection(lc.geom, dl.geom))::float8), 0)
          / NULLIF(ST_Area(lc.geom)::float8, 0) * 100 AS overlap_percent
  FROM
      land_covers lc
  LEFT JOIN
      data_layer dl
      ON ST_Intersects(lc.geom, dl.geom)
  WHERE
      lc.sheet_id = $1 AND
      lc.parcel_id = $2 AND
      lc.land_cover_class_code = ANY($3)
  GROUP BY
      lc.sheet_id, lc.parcel_id, lc.geom;
`

async function getDataLayerQuery(
  sheetId,
  parcelId,
  landCoverClassCodes,
  db,
  logger
) {
  let client

  try {
    client = await db.connect()

    const values = [sheetId, parcelId, landCoverClassCodes]
    const result = await client.query(dataLayerQuery, values)

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

export { getDataLayerQuery, dataLayerQuery }
