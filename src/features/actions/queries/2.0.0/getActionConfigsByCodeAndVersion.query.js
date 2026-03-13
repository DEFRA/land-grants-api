import { logDatabaseError } from '~/src/features/common/helpers/logging/log-helpers.js'
import { actionConfigTransformer } from '~/src/features/actions/transformers/2.0.0/actionConfig.transformer.js'

/**
 * Get action configs for the given codes and versions.
 * When a version is omitted for an entry, the latest version for that code is returned.
 * @param {Logger} logger - The logger
 * @param {Pool} db - The postgres instance
 * @param {ActionCodeVersion[]} actions - Array of action code/version pairs to retrieve
 * @returns {Promise<Action[]>} The matching action configs
 */
async function getActionConfigsByCodeAndVersion(logger, db, actions) {
  let client
  try {
    client = await db.connect()

    const query = `
      WITH requested AS (
        SELECT
          r->>'code' AS code,
          r->>'version' AS version
        FROM jsonb_array_elements($1::jsonb) AS r
      )
      SELECT DISTINCT ON (a.code)
        a.*,
        ac.version,
        ac.major_version,
        ac.minor_version,
        ac.patch_version,
        ac.config->>'start_date' AS start_date,
        ac.config->>'application_unit_of_measurement' AS application_unit_of_measurement,
        (ac.config->>'duration_years')::numeric AS duration_years,
        ac.config->'payment' AS payment,
        ac.config->'land_cover_class_codes' AS land_cover_class_codes,
        ac.config->'rules' AS rules,
        ac.last_updated_at AS last_updated,
        ac.semantic_version AS semantic_version,
        ac.group_id AS group_id,
        ag.name AS group_name,
        ac.display_order AS display_order
      FROM actions a
      JOIN actions_config ac ON a.code = ac.code
      JOIN requested r ON r.code = a.code
      LEFT OUTER JOIN action_groups ag ON ac.group_id = ag.id
      WHERE (r.version IS NULL OR ac.semantic_version = r.version)
      ORDER BY a.code, ac.major_version DESC, ac.minor_version DESC, ac.patch_version DESC
    `

    const result = await client.query(query, [JSON.stringify(actions)])

    return result.rows.map(actionConfigTransformer)
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get action configs by code and version',
      error
    })
    return []
  } finally {
    if (client) {
      client.release()
    }
  }
}

export { getActionConfigsByCodeAndVersion }

/**
 * @import {Action} from '../../action.d.js'
 * @import {Logger} from '~/src/features/common/logger.d.js'
 * @import {Pool} from '~/src/features/common/postgres.d.js'
 * @import {ActionCodeVersion} from '../../action.d.js'
 */
