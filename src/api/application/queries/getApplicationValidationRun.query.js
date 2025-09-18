/**
 * @import {ApplicationResult} from '../application.d.js'
 */

/**
 * Get latest application validation run
 * @param {object} logger - The logger
 * @param {object} db - The postgres instance
 * @param {string} id - The id of the application validation run
 * @returns {Promise<ApplicationResult>} The application validation run
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
