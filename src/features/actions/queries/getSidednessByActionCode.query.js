import { logDatabaseError } from '~/src/features/common/helpers/logging/log-helpers.js'
import { BOTH_SIDES } from '~/src/features/common/constants/sidedness.js'

/**
 * Get the sidedness of each action code. A code with no actions row, or a row
 * with no sidedness, is both-sides.
 * @param {string[]} actionCodes - The action codes to look up
 * @param {Pool} db - The database connection
 * @param {Logger} logger - The logger
 * @returns {Promise<SidednessByActionCode>} The sidedness of every requested code
 */
export async function getSidednessByActionCode(actionCodes, db, logger) {
  if (actionCodes.length === 0) {
    return {}
  }

  let client

  try {
    client = await db.connect()

    const result = await client.query(
      'SELECT code, sidedness FROM actions WHERE code = ANY ($1)',
      [actionCodes]
    )

    const storedByCode = new Map(
      result.rows.map((row) => [row.code, row.sidedness])
    )

    return Object.fromEntries(
      actionCodes.map((code) => [code, storedByCode.get(code) ?? BOTH_SIDES])
    )
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get action sidedness',
      error
    })
    throw error
  } finally {
    if (client) {
      client.release()
    }
  }
}

/**
 * @import { SidednessByActionCode } from '~/src/features/available-length/available-length.d.js'
 * @import { Logger } from '~/src/features/common/logger.d.js'
 * @import { Pool } from '~/src/features/common/postgres.d.js'
 */
