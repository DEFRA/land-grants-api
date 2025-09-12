/**
 * @import {ApplicationValidationRun} from '../application.d.js'
 */

/**
 * Get latest application validation run
 * @param {object} logger - The logger
 * @param {object} db - The postgres instance
 * @param {string} applicationId - The application id of the application validation run
 * @returns {Promise<ApplicationValidationRun>} The application validation run
 */
async function getApplicationValidationRun(logger, db, applicationId) {
  let client
  try {
    logger.info(
      `Connecting to DB to fetch latest application validation run by id`
    )
    client = await db.connect()

    const query = `
      SELECT * FROM application_results WHERE application_id = $1 ORDER BY created_at DESC LIMIT 1
    `
    const result = await client.query(query, [applicationId])

    return result.rows[0]
  } catch (error) {
    logger.error(
      `Error executing get application validation run by id query: ${error.message}`
    )
    return null
  } finally {
    if (client) {
      client.release()
    }
  }
}

export { getApplicationValidationRun }
