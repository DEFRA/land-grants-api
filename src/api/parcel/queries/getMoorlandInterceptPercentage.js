import { roundSqm } from '../../common/helpers/measurement.js'

async function getMoorlandInterceptPercentage(sheetId, parcelId, db, logger) {
  let client

  try {
    client = await db.connect()
    logger.info(
      `Retrieving moorland intercept percentage for ${sheetId}-${parcelId}`
    )

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
          p.parcel_id = $2
      GROUP BY
          p.sheet_id, p.parcel_id, p.geom;
    `

    const values = [sheetId, parcelId]
    const result = await client.query(query, values)

    logger.info(
      `Retrieved moorland intercept percentage for ${sheetId}-${parcelId} , ${result.rows}`
    )

    const roundedMoorlandOverlapPercent = roundSqm(
      result?.rows?.[0]?.moorland_overlap_percent || 0
    )

    console.log(
      '--------> moorland_overlap_percent',
      result?.rows?.[0]?.moorland_overlap_percent || 0,
      roundedMoorlandOverlapPercent
    )
    return roundedMoorlandOverlapPercent
  } catch (error) {
    logger.error(
      'Error executing get moorland intercept percentage query',
      error
    )
    return 0
  } finally {
    if (client) {
      client.release()
    }
  }
}

export { getMoorlandInterceptPercentage }
