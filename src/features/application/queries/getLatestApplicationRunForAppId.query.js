import {
  logDatabaseError,
  logInfo
} from '~/src/features/common/helpers/logging/log-helpers.js'

/**
 * Get the latest application validation run for a given application id
 * @param {Logger} logger - The logger
 * @param {Pool} db - The postgres instance
 * @param {string} applicationId - The application id to query by
 * @returns {Promise<ApplicationResult | null>} The latest application validation run, or null if not found or on error
 */
async function getLatestApplicationRunForAppId(logger, db, applicationId) {
  let client
  try {
    logInfo(logger, {
      category: 'database',
      message: 'Get latest application run for application id',
      context: {
        applicationId
      }
    })
    client = await db.connect()

    const query = `
      SELECT * FROM application_results WHERE application_id = $1 ORDER BY created_at DESC LIMIT 1
    `
    const result = await client.query(query, [applicationId?.toLowerCase()])

    return result.rows[0] ?? null
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get latest application run for application id',
      error
    })
    return null
  } finally {
    if (client) {
      client.release()
    }
  }
}

export { getLatestApplicationRunForAppId }

/**
 * @import {ApplicationResult} from '../application.d.js'
 * @import {Logger} from '~/src/features/common/logger.d.js'
 * @import {Pool} from '~/src/features/common/postgres.d.js'
 */
