import { logInfo } from '../../common/helpers/logging/log-helpers.js'

/**
 * Save application
 * @param {object} logger - The logger
 * @param {object} db - The postgres instance
 * @param {object} application - The application
 * @returns {Promise<string | null>} The application or null if an error occurs
 */
async function saveApplication(logger, db, application) {
  let client
  try {
    logInfo(logger, {
      category: 'application',
      message: 'Saving application',
      context: {
        applicationId: application.application_id,
        sbi: application.sbi,
        crn: application.crn
      }
    })
    client = await db.connect()

    const query = `
      INSERT INTO application_results (application_id, sbi, crn, data)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `

    const result = await client.query(query, [
      application.application_id,
      application.sbi,
      application.crn,
      application.data
    ])

    return result.rows[0].id
  } catch (error) {
    logger.error(`Error executing get action query: ${error.message}`)
    return null
  } finally {
    if (client) {
      client.release()
    }
  }
}

export { saveApplication }
