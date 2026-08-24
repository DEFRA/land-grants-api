import { logDatabaseError } from '~/src/features/common/helpers/logging/log-helpers.js'
import { actionConfigTransformer } from '~/src/features/actions/transformers/2.0.0/actionConfig.transformer.js'

/**
 * Get a single action config at an exact semantic version (e.g. '1.1.0').
 * Used to pin claims and recalculations to the rate version recorded when
 * an agreement was created. Returns null when no enabled config exists at
 * that exact version.
 * @param {Logger} logger - The logger
 * @param {Pool} db - The postgres instance
 * @param {string} code - Action code, e.g. 'PA3'
 * @param {string} semanticVersion - Exact semantic version, e.g. '1.1.0'
 * @returns {Promise<Action|null>} The action config, or null if not found
 * @throws {Error} When the database query fails
 */
async function getActionBySemanticVersion(logger, db, code, semanticVersion) {
  let client
  try {
    client = await db.connect()

    const query = `
      SELECT
        a.*,
        ac.version,
        ac.major_version,
        ac.minor_version,
        ac.patch_version,
        ac.config->>'start_date' as start_date,
        ac.config->>'application_unit_of_measurement' as application_unit_of_measurement,
        (ac.config->>'duration_years')::numeric as duration_years,
        ac.config->'payment' as payment,
        ac.config->'land_cover_class_codes' as land_cover_class_codes,
        ac.config->'rules' as rules,
        ac.config->>'guidance_url' as guidance_url,
        ac.config->'availability' as availability,
        ac.last_updated_at as last_updated,
        ac.semantic_version as semantic_version,
        ac.group_id as group_id,
        ag.name as group_name,
        ac.display_order as display_order,
        ac.config->'payment_method' as payment_method
      FROM actions a
      JOIN actions_config ac ON a.code = ac.code
      LEFT OUTER JOIN action_groups ag ON ac.group_id = ag.id
      WHERE a.enabled = TRUE
        AND a.code = $1
        AND ac.semantic_version = $2
      LIMIT 1
    `
    const result = await client.query(query, [code, semanticVersion])

    return result.rows[0] ? actionConfigTransformer(result.rows[0]) : null
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get action by semantic version',
      error
    })
    throw error
  } finally {
    if (client) {
      client.release()
    }
  }
}

export { getActionBySemanticVersion }

/**
 * @import {Action} from '../../action.d.js'
 * @import {Logger} from '~/src/features/common/logger.d.js'
 * @import {Pool} from '~/src/features/common/postgres.d.js'
 */
