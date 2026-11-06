import { logDatabaseError } from '~/src/features/common/helpers/logging/log-helpers.js'

/**
 * Whether a compatibility matrix file has already been ingested: its rows are tagged in
 * updated_by with the filename. Errors are rethrown so a failed check never triggers a reload.
 * @param {import('~/src/features/common/logger.d.js').Logger} logger
 * @param {import('~/src/features/common/postgres.d.js').Pool} db
 * @param {string} filename - e.g. 'compatibility_matrix_0.1.0.csv'
 * @returns {Promise<boolean>}
 */
async function isCompatibilityMatrixIngested(logger, db, filename) {
  let client
  try {
    client = await db.connect()
    const result = await client.query(
      'SELECT EXISTS (SELECT 1 FROM compatibility_matrix WHERE updated_by = $1) AS ingested',
      [filename]
    )
    return result.rows[0].ingested
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Check compatibility_matrix ingested',
      error
    })
    throw error
  } finally {
    if (client) {
      client.release()
    }
  }
}

export { isCompatibilityMatrixIngested }
