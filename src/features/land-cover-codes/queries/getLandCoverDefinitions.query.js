import {
  logDatabaseError,
  logInfo,
  logValidationWarn
} from '~/src/features/common/helpers/logging/log-helpers.js'

/**
 * Get all land cover codes for one or more action codes
 * @param {string[]} landCoverCodes - The land cover codes to get
 * @param {Pool} db - The database connection
 * @param {Logger} logger - The logger
 * @returns {Promise<LandCoverDefinition[]>}>} The land cover codes object
 */
export async function getLandCoverDefinitions(landCoverCodes, db, logger) {
  let client

  try {
    if (!Array.isArray(landCoverCodes) || landCoverCodes.length === 0) {
      logValidationWarn(logger, {
        operation: 'Fetch land cover definitions',
        errors: 'No land cover codes provided'
      })
      return []
    }

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
      logInfo(logger, {
        category: 'database',
        operation: 'Get land cover definitions',
        message: 'No land cover codes found',
        context: { landCoverCodes: landCoverCodes.join(',') }
      })
      return []
    }

    return transformLandCoverDefinitions(dbResponse.rows)
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get land cover definitions',
      error
    })
    throw error
  } finally {
    if (client) {
      client.release()
    }
  }
}

/**
 * Transforms the rows from the database into an array of land cover definitions
 * @param {LandCoverDefinitionDB[]} rows - The rows from the database
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
 * @import { LandCoverDefinition, LandCoverDefinitionDB } from '../land-cover-codes.d.js'
 * @import { Logger } from '~/src/features/common/logger.d.js'
 * @import { Pool } from '~/src/features/common/postgres.d.js'
 */
