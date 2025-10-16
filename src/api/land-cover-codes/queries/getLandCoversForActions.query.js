import {
  logDatabaseError,
  logInfo,
  logValidationWarn
} from '~/src/api/common/helpers/logging/log-helpers.js'

/**
 * Get all land cover codes for one or more action codes
 * @param {string[]} actionCodes - The action code(s) to get land cover codes for
 * @param {Pool} db - The database connection
 * @param {Logger} logger - The logger
 * @returns {Promise<{[key:string]: LandCoverCodes[]}>} The land cover codes object
 */
async function getLandCoversForActions(actionCodes, db, logger) {
  let client

  try {
    if (!Array.isArray(actionCodes) || actionCodes.length === 0) {
      logValidationWarn(logger, {
        operation: 'Fetch land covers for actions',
        errors: 'No action codes provided'
      })
      return {}
    }

    client = await db.connect()
    const query = `
      SELECT DISTINCT action_code, land_cover_code, land_cover_class_code
        FROM public.land_cover_codes_actions
        WHERE action_code = ANY ($1)`

    const actionLandCovers = await client.query(query, [actionCodes])

    if (!actionLandCovers || actionLandCovers?.rows?.length === 0) {
      logValidationWarn(logger, {
        operation: 'Fetch land covers for actions',
        errors: `No land cover codes found for action codes: ${actionCodes.join(', ')}`
      })
      return {}
    }

    logInfo(logger, {
      category: 'database',
      operation: 'Get land cover codes for action codes',
      reference: `actionCodes:${actionCodes.join(',')},items: ${actionLandCovers?.rows?.length}`
    })

    return transformLandCoversForActions(actionLandCovers, actionCodes)
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get land cover codes for action codes',
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
 * Get all land cover codes for one or more action codes
 * @param {string} actionCode - The action code to get land cover codes for
 * @param {Pool} db - The database connection
 * @param {Logger} logger - The logger
 * @returns {Promise<LandCoverCodes[]>} The land cover codes array
 */
async function getLandCoversForAction(actionCode, db, logger) {
  return (
    (await getLandCoversForActions([actionCode], db, logger))[actionCode] || []
  )
}
/**
 * Transforms action land covers query response
 * @param {{ rows: LandCoverDefinitionDB[] | Array<never>}} actionLandCovers
 * @param {string[]} actionCodes
 * @returns {{[key:string]: LandCoverCodes[]} | object} The land cover codes object
 */
const transformLandCoversForActions = (actionLandCovers, actionCodes) => {
  const landCovers = {}
  for (const code of actionCodes) {
    landCovers[code] = []
  }
  for (const landCover of actionLandCovers?.rows || []) {
    landCovers[landCover.action_code].push({
      landCoverCode: landCover.land_cover_code,
      landCoverClassCode: landCover.land_cover_class_code
    })
  }

  return landCovers
}

export { getLandCoversForAction, getLandCoversForActions }

/**
 * @import { LandCoverCodes, LandCoverDefinitionDB } from '../land-cover-codes.d.js'
 * @import { Logger } from '~/src/api/common/logger.d.js'
 * @import { Pool } from '~/src/api/common/postgres.d.js'
 */
