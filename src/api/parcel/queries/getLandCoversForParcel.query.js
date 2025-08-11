/**
 * Get available area of a land parcel excluding specified land cover classes.
 * @param {string} sheetId - Sheet ID of the parcel.
 * @param {string} parcelId - Parcel ID.
 * @param {object} db - DB connection object
 * @param {object} logger - logger object
 * @returns {Promise<LandCover[]>} Available area in square meters.
 * @throws {Error} Throws error if something goes wrong
 */
async function getLandCoversForParcel(sheetId, parcelId, db, logger) {
  let client
  try {
    client = await db.connect()

    const landCoversQuery = `
        SELECT
          lc.land_cover_class_code, ST_Area(lc.geom) AS area_sqm
        FROM land_covers lc
        WHERE lc.sheet_id = $1
          AND lc.parcel_id = $2
        ORDER BY lc.land_cover_class_code, lc.area_sqm
    `

    logger.info(`Retrieving land covers for parcelId: ${sheetId}-${parcelId}`)

    const result = await client.query(landCoversQuery, [sheetId, parcelId])

    const landCovers = result.rows.map((row) => ({
      landCoverClassCode: row.land_cover_class_code,
      areaSqm: Number(row.area_sqm)
    }))

    return landCovers
  } catch (err) {
    logger.error(
      `Error retrieving land covers for parcelId: ${sheetId}-${parcelId} ${err.message}`,
      err
    )
    throw err
  } finally {
    if (client) {
      client.release()
    }
  }
}

export { getLandCoversForParcel }

/**
 * @import { LandCover } from '../parcel.d.js'
 */
