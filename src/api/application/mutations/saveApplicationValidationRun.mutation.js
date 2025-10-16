import {
  logDatabaseError,
  logInfo
} from '../../common/helpers/logging/log-helpers.js'

/**
 * Save application validation run
 * @param {Logger} logger - The logger
 * @param {Pool} db - The postgres instance
 * @param {ApplicationResult} applicationValidationRun - The application
 * @returns {Promise<ApplicationResult | null>} The application validation run result
 */
async function saveApplicationValidationRun(
  logger,
  db,
  applicationValidationRun
) {
  let client
  try {
    client = await db.connect()

    const query = `
      INSERT INTO application_results (application_id, sbi, crn, data)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `

    const result = await client.query(query, [
      applicationValidationRun.application_id,
      applicationValidationRun.sbi,
      applicationValidationRun.crn,
      applicationValidationRun.data
    ])

    logInfo(logger, {
      category: 'application',
      operation: 'Save application validation run'
    })

    return result.rows[0]
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'saveApplicationValidationRun',
      error
    })
    return null
  } finally {
    if (client) {
      client.release()
    }
  }
}

export { saveApplicationValidationRun }

/**
 * @import {ApplicationResult} from '../application.d.js'
 * @import {Logger} from '~/src/api/common/logger.d.js'
 * @import {Pool} from '~/src/api/common/postgres.d.js'
 */
