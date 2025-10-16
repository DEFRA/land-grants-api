/**
 * @import {ApplicationResult} from '../application.d.js'
 * @import {Logger} from '~/src/api/common/logger.d.js'
 * @import {Pool} from '~/src/api/common/postgres.d.js'
 */

import { logDatabaseError } from '~/src/api/common/helpers/logging/log-helpers.js'

/**
 * Get latest application validation run
 * @param {Logger} logger - The logger
 * @param {Pool} db - The postgres instance
 * @param {string} id - The id of the application validation run
 * @returns {Promise<ApplicationResult | null>} The application validation run
 */
async function getApplicationValidationRun(logger, db, id) {
  let client
  try {
    logger.info(
      `Connecting to DB to fetch latest application validation run by id`
    )
    client = await db.connect()

    const query = `
      SELECT * FROM application_results WHERE id = $1 ORDER BY created_at DESC LIMIT 1
    `
    const result = await client.query(query, [id])

    return result.rows[0]
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get application validation run',
      error
    })
    return null
  } finally {
    if (client) {
      client.release()
    }
  }
}

export { getApplicationValidationRun }
