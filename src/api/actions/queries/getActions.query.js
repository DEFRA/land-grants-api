/**
 * @import {Action} from '../action.d.js'
 */

import { actionTransformer } from '../transformers/action.transformer.js'

/**
 * Get enabled actions
 * @param {object} logger - The logger
 * @param {object} db - The postgres instance
 * @returns {Promise<Action[]>} The actions
 */
async function getEnabledActions(logger, db) {
  let client
  try {
    logger.info(`Connecting to DB to fetch actions`)
    client = await db.connect()

    const query = `
      SELECT
        a.*,
        ac.version,
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

    return result.rows.map(actionTransformer)
  } catch (error) {
    logger.error(`Error executing get action query: ${error.message}`)
    return []
  } finally {
    if (client) {
      client.release()
    }
  }
}

export { getEnabledActions }
