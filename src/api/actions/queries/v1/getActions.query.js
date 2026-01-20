import { logDatabaseError } from '../../../common/helpers/logging/log-helpers.js'
import { actionConfigTransformer } from '../../transformers/actionConfig.transformer.js'

/**
 * Get enabled action configs
 * @param {Logger} logger - The logger
 * @param {Pool} db - The postgres instance
 * @returns {Promise<Action[]>} The action configs
 */
async function getEnabledActions(logger, db) {
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
        ac.last_updated_at as last_updated
      FROM actions a
      JOIN actions_config ac ON a.code = ac.code
      WHERE a.enabled = TRUE AND ac.is_active = TRUE
    `
    const result = await client.query(query)

    return result.rows.map(actionConfigTransformer)
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get enabled actions',
      error
    })
    return []
  } finally {
    if (client) {
      client.release()
    }
  }
}

export { getEnabledActions }

/**
 * @import {Action} from '../../action.d.js'
 * @import {Logger} from '~/src/api/common/logger.d.js'
 * @import {Pool} from '~/src/api/common/postgres.d.js'
 */
