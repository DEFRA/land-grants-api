import { logDatabaseError } from '~/src/features/common/helpers/logging/log-helpers.js'

/**
 * Insert a new action config version into the DB.
 * Wraps in a transaction: deactivates the existing active row first,
 * then inserts the new row with is_active=TRUE.
 * @param {import('~/src/features/common/logger.d.js').Logger} logger
 * @param {import('~/src/features/common/postgres.d.js').Pool} db
 * @param {{ code: string, config: object, major: number, minor: number, patch: number, displayOrder: number }} params
 * @returns {Promise<boolean>} true on success
 */
async function insertActionConfig(logger, db, params) {
  const { code, config, major, minor, patch, displayOrder } = params
  let client
  try {
    client = await db.connect()
    await client.query('BEGIN')

    await client.query(
      'UPDATE actions_config SET is_active = FALSE WHERE code = $1 AND is_active = TRUE',
      [code]
    )

    await client.query(
      `INSERT INTO actions_config
         (code, version, config, is_active, last_updated_at, major_version, minor_version, patch_version, display_order)
       VALUES (
         $1,
         (SELECT CAST(COALESCE(MAX(version::integer), 0) + 1 AS text) FROM actions_config WHERE code = $1),
         $2, TRUE, NOW(), $3, $4, $5, $6
       )`,
      [code, JSON.stringify(config), major, minor, patch, displayOrder]
    )

    await client.query('COMMIT')
    return true
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK').catch(() => undefined)
    }
    logDatabaseError(logger, {
      operation: 'Insert action config',
      error
    })
    return false
  } finally {
    if (client) {
      client.release()
    }
  }
}

export { insertActionConfig }
