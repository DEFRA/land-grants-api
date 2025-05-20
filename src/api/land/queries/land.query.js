/**
 * Get a land data
 * @param {string} sheetId - The sheetId
 * @param {string} parcelId - The parcelId
 * @param {{object, object}} DB connection and logger object
 * @returns {object} The land data
 */
async function getLandData(sheetId, parcelId, { db, logger }) {
  let client

  try {
    logger.info(
      `Connecting to DB to fetch info parcelId: ${parcelId} sheetId ${sheetId}`
    )
    client = await db.connect()
    logger.info(
      `Retrieving land parcels for parcelId: ${parcelId} sheetId ${sheetId}`
    )

    const query =
      'SELECT * FROM land.land_parcels WHERE sheet_id = $1 and parcel_id = $2'
    const values = [sheetId, parcelId]

    const result = await client.query(query, values)
    logger.info(
      `Retrieved land parcels for parcelId:-  ${parcelId} sheetId ${sheetId} , ${result.rows}`
    )

    return result.rows
  } catch (error) {
    logger.error('Error executing get Land parcels query', error)
    return
  } finally {
    if (client) {
      client.release()
    }
  }
}

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
    logger.info(
      `Calculating area for sheetId: ${sheetId}, parcelId: ${parcelId}, and cover codes: ${landCoverClassCodes}`
    )

    const result = await client.query(
      `WITH target_parcel AS (
        SELECT geom
        FROM land.land_parcels
        WHERE sheet_id = $1
          AND parcel_id = $2
      ),
      excluded_land_cover_geom AS (
        SELECT ST_Union(geom) AS unioned_geom
        FROM land.land_covers
        WHERE sheet_id = $1
          AND parcel_id = $2
          AND land_cover_class_code = ANY(ARRAY[$3])
      ),
      difference_geom AS (
        SELECT
          ST_Difference(
            p.geom,
            COALESCE(lc.unioned_geom, ST_GeomFromText('GEOMETRYCOLLECTION EMPTY', ST_SRID(p.geom)))
          ) AS remaining_geom
        FROM target_parcel p
        LEFT JOIN excluded_land_cover_geom lc ON TRUE
      )
      SELECT ST_Area(remaining_geom) AS area_after_exclusion
      FROM difference_geom`,
      [sheetId, parcelId, landCoverClassCodes]
    )

    logger.info(
      `Calculated area for sheetId: ${sheetId}, parcelId: ${parcelId}, and cover codes: ${landCoverClassCodes}`
    )
    const area = result.rows[0]?.area_after_exclusion
    return area !== null ? parseFloat(area) : 0
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

export { getLandData, getParcelAvailableArea }
