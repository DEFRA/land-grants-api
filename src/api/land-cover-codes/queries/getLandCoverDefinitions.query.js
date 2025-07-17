/**
 * Get all land cover codes for one or more action codes
 * @param {string[]} landCoverCodes - The land cover codes to get
 * @param {object} db - The database connection
 * @param {object} logger - The logger
 * @returns {Promise<{[key:string]: LandCoverDefinition}>} The land cover codes object
 */
export async function getLandCoverDefinitions(landCoverCodes, db, logger) {
  let client

  try {
    if (!Array.isArray(landCoverCodes) || landCoverCodes.length === 0) {
      logger.warn('No land cover codes provided')
      return {}
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
        WHERE land_cover_code = ANY ($1)`

    const dbResponse = await client.query(query, [landCoverCodes])

    if (!dbResponse || dbResponse?.rows?.length === 0) {
      logger.warn(
        `No land cover codes found for land cover codes: ${landCoverCodes.join(', ')}`
      )
      return {}
    }

    logger.info(
      `Retrieved land covers for land cover definitions: ${landCoverCodes.join(', ')}, items: ${dbResponse?.rows?.length}`
    )

    return transformLandCoversForActions(dbResponse.rows, logger)
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
 * Transforms action land covers query response
 * @param {object[]} rows
 * @param {object} logger
 * @returns {{[key:string]: LandCoverDefinition}} The land cover codes object
 */
const transformLandCoversForActions = (rows, logger) => {
  /** @type {{[key:string]: LandCoverDefinition}} */
  const transformed = {}

  for (const row of rows) {
    if (transformed[row.land_cover_code] != null) {
      logger.warn(
        `Duplicate land cover code found for action code: ${row.action_code}`
      )
      continue
    }
    transformed[row.land_cover_code] = {
      landCoverCode: row.land_cover_code,
      landCoverClassCode: row.land_cover_class_code,
      landCoverTypeCode: row.land_cover_type_code,
      landCoverTypeDescription: row.land_cover_type_description,
      landCoverClassDescription: row.land_cover_class_description,
      landCoverDescription: row.land_cover_description
    }
  }

  return transformed
}

/**
 * @import { LandCoverDefinition } from '../land-cover-codes.d.js'
 */
