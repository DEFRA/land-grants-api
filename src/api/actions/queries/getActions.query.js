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

    const query = `SELECT * FROM actions WHERE enabled = TRUE`
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
