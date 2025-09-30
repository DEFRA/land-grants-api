/**
 * @import {ApplicationResult} from '../application.d.js'
 */

/**
 * Get latest application validation runs
 * @param {object} logger - The logger
 * @param {object} db - The postgres instance
 * @param {string} applicationId - The application id of the application validation runs
 * @returns {Promise<ApplicationResult>} The application validation runs
 */
async function getApplicationValidationRuns(logger, db, applicationId) {
  let client
  try {
    logger.info(
      `Connecting to DB to fetch latest application validation runs by application id`
    )
    client = await db.connect()

    const query = `
      SELECT * FROM application_results WHERE application_id = $1 ORDER BY created_at DESC
    `
    const result = await client.query(query, [applicationId?.toLowerCase()])

    return result.rows
  } catch (error) {
    logger.error(
      `Error executing get application validation runs by application id query: ${error.message}`
    )
    return null
  } finally {
    if (client) {
      client.release()
    }
  }
}

export { getApplicationValidationRuns }
