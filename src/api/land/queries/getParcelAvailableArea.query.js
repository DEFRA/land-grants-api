/**
 * Get available area of a land parcel excluding specified land cover classes.
 * @param {string} sheetId - Sheet ID of the parcel.
 * @param {string} parcelId - Parcel ID.
 * @param {object} landCoverClassCodes - Array of land cover class codes to exclude.
 * @param {object} db - DB connection object
 * @param {object} logger - logger object
 * @returns {Promise<number>} Available area in square meters.
 */
async function getParcelAvailableArea(
  sheetId,
  parcelId,
  landCoverClassCodes,
  db,
  logger
) {
  let client
  try {
    client = await db.connect()

    const avaialbleAreaCalculationQuery = `WITH target_parcel AS (
    SELECT geom
    FROM land_parcels
    WHERE sheet_id = $1
      AND parcel_id = $2
),
intersected_land_covers AS (
    SELECT
      ST_Intersection(lc.geom, p.geom) AS clipped_geom
    FROM land_covers lc
    JOIN target_parcel p
      ON ST_Intersects(lc.geom, p.geom)
    WHERE lc.sheet_id = $1
      AND lc.parcel_id = $2
      AND lc.land_cover_class_code = ANY($3)
),
unioned_geom AS (
    SELECT ST_Union(clipped_geom) AS merged_geom
    FROM intersected_land_covers
)
SELECT ST_Area(merged_geom) AS total_land_cover_area
FROM unioned_geom
`
    logger.info(
      `Executing Avaialble Area Calculation Query with values: ${JSON.stringify([sheetId, parcelId, landCoverClassCodes])}`
    )
    const result = await client.query(avaialbleAreaCalculationQuery, [
      sheetId,
      parcelId,
      landCoverClassCodes
    ])

    logger.info(
      `Calculated area for sheetId: ${sheetId}, parcelId: ${parcelId}, and cover codes: ${landCoverClassCodes}`
    )

    const area = result.rows[0]?.total_land_cover_area
    return area !== null ? Math.round(area * 100) / 100 : 0
  } catch (err) {
    logger.error(
      `Error calculating area for sheetId: ${sheetId}, parcelId: ${parcelId}, and cover codes: ${landCoverClassCodes} ${err.message}, ${err.stack}`
    )
    throw err
  } finally {
    if (client) {
      client.release()
    }
  }
}

export { getParcelAvailableArea }
