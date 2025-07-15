/**
 * @import {LandCoverCodes} from '../land-cover-codes.d.js'
 */

/**
 * Get all land cover codes
 * @param {string} actionCode - The action code to get land cover codes for
 * @param {object} db - The database connection
 * @param {object} logger - The logger
 * @returns {Promise<LandCoverCodes[]>} The land cover codes
 */
async function getLandCoversForAction(actionCode, db, logger) {
  let client

  try {
    logger.info(
      `Connecting to DB to fetch land cover codes for action code: ${actionCode}`
    )

    client = await db.connect()

    const query = `
      SELECT DISTINCT land_cover_code as landCoverCode, land_cover_class_code as landCoverClassCode
        FROM public.land_cover_codes_actions
        WHERE action_code = $1`

    const actionLandCovers = await client.query(query, [actionCode])

    if (!actionLandCovers || actionLandCovers?.rows?.length === 0) {
      logger.warn(`No land cover codes found for action code: ${actionCode}`)
      return []
    }

    logger.info(
      `Retrieved land cover codes for action code: ${actionCode}, items: ${actionLandCovers?.rows?.length}`
    )

    return actionLandCovers?.rows
  } catch (error) {
    logger.error(`Unable to get land cover codes`, error)
    throw error
  } finally {
    if (client) {
      client.release()
    }
  }
}

export { getLandCoversForAction }
