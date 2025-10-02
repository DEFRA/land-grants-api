/**
 * Get all land cover codes for one or more action codes
 * @param {string[]} landCoverCodes - The land cover codes to get
 * @param {object} db - The database connection
 * @param {object} logger - The logger
 * @returns {Promise<LandCoverDefinition[]>}>} The land cover codes object
 */
export async function getLandCoverDefinitions(landCoverCodes, db, logger) {
  let client

  try {
    if (!Array.isArray(landCoverCodes) || landCoverCodes.length === 0) {
      logger.warn('No land cover codes provided')
      return []
    }

    logger.info(
      `Connecting to DB to fetch land cover definitions for land cover codes: ${landCoverCodes.join(', ')}`
    )

    client = await db.connect()
    const query = `
      SELECT DISTINCT land_cover_type_code,
            land_cover_type_description,
            land_cover_class_code,
            land_cover_class_description,
            land_cover_code,
            land_cover_description,
            land_use_code,
            land_use_description
        FROM public.land_cover_codes
        WHERE land_cover_code = ANY ($1)
        OR land_cover_class_code = ANY ($1)`

    const dbResponse = await client.query(query, [landCoverCodes])

    if (!dbResponse || dbResponse?.rows?.length === 0) {
      logger.warn(
        `No land cover codes found for land cover codes: ${landCoverCodes.join(', ')}`
      )
      return []
    }

    logger.info(
      `Retrieved land covers for land cover definitions: ${landCoverCodes.join(', ')}, items: ${dbResponse?.rows?.length}`
    )

    return transformLandCoverDefinitions(dbResponse.rows)
  } catch (error) {
    logger.error(`Unable to get land cover definitions`, error)
    throw error
  } finally {
    if (client) {
      client.release()
    }
  }
}

/**
 * Transforms the rows from the database into an array of land cover definitions
 * @param {object[]} rows - The rows from the database
 * @returns {LandCoverDefinition[]} The land cover definitions
 */
function transformLandCoverDefinitions(rows) {
  const landCoverDefinitions = []

  for (const row of rows) {
    const landCoverDefinition = {
      landCoverCode: row.land_cover_code,
      landCoverClassCode: row.land_cover_class_code,
      landCoverTypeCode: row.land_cover_type_code,
      landCoverTypeDescription: row.land_cover_type_description,
      landCoverClassDescription: row.land_cover_class_description,
      landCoverDescription: row.land_cover_description
    }

    landCoverDefinitions.push(landCoverDefinition)
  }

  return landCoverDefinitions
}

/**
 * @import { LandCoverDefinition } from '../land-cover-codes.d.js'
 */
