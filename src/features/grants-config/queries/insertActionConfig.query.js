import { logDatabaseError } from '~/src/features/common/helpers/logging/log-helpers.js'

/**
 * Insert a new action config version into the DB.
 * Wraps in a transaction: deactivates the existing active row only when the
 * new semantic version is strictly higher, then inserts the new row.
 * is_active on the new row is TRUE only if no active row remains after the UPDATE.
 * @param {import('~/src/features/common/logger.d.js').Logger} logger
 * @param {import('~/src/features/common/postgres.d.js').Pool} db
 * @param {{ code: string, config: object, major: number, minor: number, patch: number, displayOrder: number, description: string|null, sssiEligible: boolean, hfEligible: boolean, groupId: number|null }} params
 * @returns {Promise<boolean>} true on success
 */
async function insertActionConfig(logger, db, params) {
  const {
    code,
    config,
    major,
    minor,
    patch,
    displayOrder,
    description,
    sssiEligible,
    hfEligible,
    groupId
  } = params
  let client
  try {
    client = await db.connect()
    await client.query('BEGIN')

    await client.query(
      `INSERT INTO actions (code, enabled, display, description, sssi_eligible, hf_eligible, last_updated)
       VALUES ($1, TRUE, TRUE, $2, $3, $4, NOW())
       ON CONFLICT (code) DO UPDATE SET
         description = COALESCE(EXCLUDED.description, actions.description),
         enabled = EXCLUDED.enabled,
         display = EXCLUDED.display,
         last_updated = NOW()`,
      [code, description, sssiEligible, hfEligible]
    )

    await client.query(
      `UPDATE actions_config
       SET is_active = FALSE
       WHERE code = $1
         AND is_active = TRUE
         AND (
           $2 > major_version
           OR ($2 = major_version AND $3 > minor_version)
           OR ($2 = major_version AND $3 = minor_version AND $4 > patch_version)
         )`,
      [code, major, minor, patch]
    )

    await client.query(
      `INSERT INTO actions_config
         (code, version, config, is_active, last_updated_at, major_version, minor_version, patch_version, display_order, group_id)
       VALUES (
         $1,
         (SELECT CAST(COALESCE(MAX(version::integer), 0) + 1 AS text) FROM actions_config WHERE code = $1),
         $2,
         NOT EXISTS(SELECT 1 FROM actions_config WHERE code = $1 AND is_active = TRUE),
         NOW(), $3, $4, $5, $6, $7
       )`,
      [code, JSON.stringify(config), major, minor, patch, displayOrder, groupId]
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
