import { logDatabaseError } from '~/src/features/common/helpers/logging/log-helpers.js'

/**
 * Get enabled action eligibilty
 * @param {Logger} logger - The logger
 * @param {Pool} db - The postgres instance
 * @returns {Promise<ActionEligibility[]>} The action eligibilty
 */
export async function getActionEligibilty(logger, db) {
  let client
  try {
    client = await db.connect()

    const query = `
          SELECT
            id,
            code,
            description,
            sssi_eligible,
            hf_eligible,
            ingest_id,
            last_updated
          FROM actions
        `
    const result = await client.query(query)

    return result.rows
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get actions eligibility',
      error
    })
    return []
  } finally {
    if (client) {
      client.release()
    }
  }
}

/**
 * @import {ActionEligibility} from '../action.d.js'
 * @import {Logger} from '~/src/features/common/logger.d.js'
 * @import {Pool} from '~/src/features/common/postgres.d.js'
 */
