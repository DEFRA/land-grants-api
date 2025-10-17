import {
  logDatabaseError,
  logInfo
} from '~/src/api/common/helpers/logging/log-helpers.js'

/**
 * Get latest application validation runs
 * @param {Logger} logger - The logger
 * @param {Pool} db - The postgres instance
 * @param {string} applicationId - The application id of the application validation runs
 * @returns {Promise<ApplicationResult[] | null>} The application validation runs
 */
async function getApplicationValidationRuns(logger, db, applicationId) {
  let client
  try {
    logInfo(logger, {
      category: 'database',
      message: 'Get application validation runs',
      context: {
        applicationId
      }
    })
    client = await db.connect()

    const query = `
      SELECT * FROM application_results WHERE application_id = $1 ORDER BY created_at DESC
    `
    const result = await client.query(query, [applicationId?.toLowerCase()])

    return result.rows
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get application validation runs',
      error
    })
    return null
  } finally {
    if (client) {
      client.release()
    }
  }
}

export { getApplicationValidationRuns }

/**
 * @import {ApplicationResult} from '../application.d.js'
 * @import {Logger} from '~/src/api/common/logger.d.js'
 * @import {Pool} from '~/src/api/common/postgres.d.js'
 */
