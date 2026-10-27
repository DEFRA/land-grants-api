import { logDatabaseError } from '~/src/features/common/helpers/logging/log-helpers.js'

/**
 * Update the core actions row. Only the actions eligibility CSV creates actions
 * rows, so a config for a code it has not created fails rather than inserting one.
 * @param {import('~/src/features/common/postgres.d.js').DbClient} client
 * @param {{ code: string, description: string|null }} params
 * @returns {Promise<void>}
 */
async function updateAction(client, { code, description }) {
  const result = await client.query(
    `UPDATE actions SET
       description = COALESCE($2, description),
       last_updated = NOW()
     WHERE code = $1`,
    [code, description]
  )

  if (result.rowCount === 0) {
    throw new Error(
      `No actions row for code=${code}: add it to the actions eligibility CSV`
    )
  }
}

/**
 * Deactivate the existing active config row only when the new semantic version is strictly higher.
 * @param {import('~/src/features/common/postgres.d.js').DbClient} client
 * @param {{ code: string, major: number, minor: number, patch: number }} params
 * @returns {Promise<void>}
 */
async function deactivateSupersededConfig(
  client,
  { code, major, minor, patch }
) {
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
}

/**
 * Insert the new action config version row.
 * is_active is TRUE only if no active row remains after deactivateSupersededConfig.
 * @param {import('~/src/features/common/postgres.d.js').DbClient} client
 * @param {{ code: string, config: object, major: number, minor: number, patch: number, displayOrder: number, description: string|null, groupId: number|null }} params
 * @returns {Promise<void>}
 */
async function insertConfigVersion(
  client,
  { code, config, major, minor, patch, displayOrder, description, groupId }
) {
  await client.query(
    `INSERT INTO actions_config
     (code, version, config, is_active, last_updated_at, major_version, minor_version, patch_version, display_order,
      group_id, description)
     VALUES ($1,
             (SELECT CAST(COALESCE(MAX(version::integer), 0) + 1 AS text) FROM actions_config WHERE code = $1),
             $2,
             NOT EXISTS(SELECT 1 FROM actions_config WHERE code = $1 AND is_active = TRUE),
             NOW(), $3, $4, $5, $6, $7, $8)`,
    [
      code,
      JSON.stringify(config),
      major,
      minor,
      patch,
      displayOrder,
      groupId,
      description
    ]
  )
}

/**
 * Insert a new action config version into the DB.
 * Wraps in a transaction: deactivates the existing active row only when the
 * new semantic version is strictly higher, then inserts the new row.
 * @param {import('~/src/features/common/logger.d.js').Logger} logger
 * @param {import('~/src/features/common/postgres.d.js').Pool} db
 * @param {{ code: string, config: object, major: number, minor: number, patch: number, displayOrder: number, description: string|null, groupId: number|null }} params
 * @returns {Promise<boolean>} true on success
 */
async function insertActionConfig(logger, db, params) {
  let client
  try {
    client = await db.connect()
    await client.query('BEGIN')

    await updateAction(client, params)
    await deactivateSupersededConfig(client, params)
    await insertConfigVersion(client, params)

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
