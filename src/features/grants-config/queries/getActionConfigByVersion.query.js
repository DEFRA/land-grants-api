import { logDatabaseError } from '~/src/features/common/helpers/logging/log-helpers.js'

/**
 * Check whether an action config already exists at the given semantic version.
 * @param {import('~/src/features/common/logger.d.js').Logger} logger
 * @param {import('~/src/features/common/postgres.d.js').Pool} db
 * @param {string} code - Action code, e.g. 'PA3'
 * @param {string} semanticVersion - e.g. '1.0.0'
 * @returns {Promise<boolean>} true if the version already exists
 */
async function getActionConfigByVersion(logger, db, code, semanticVersion) {
  let client
  try {
    client = await db.connect()
    const result = await client.query(
      'SELECT id FROM actions_config WHERE code = $1 AND semantic_version = $2 LIMIT 1',
      [code, semanticVersion]
    )
    return result.rows.length > 0
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get action config by version',
      error
    })
    return false
  } finally {
    if (client) {
      client.release()
    }
  }
}

export { getActionConfigByVersion }
