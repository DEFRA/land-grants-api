import {
  logDatabaseError,
  logInfo
} from '~/src/features/common/helpers/logging/log-helpers.js'
import { compatibilityMatrixTransformer } from '../transformers/compatibility-matrix.transformer.js'

/**
 * @param {Logger} logger
 * @param {Pool} db
 * @param {string[] | null} codes
 * @returns {Promise<CompatibilityMatrix[]>}
 */
async function getCompatibilityMatrix(logger, db, codes = null) {
  let client
  try {
    client = await db.connect()

    const query = `WITH year (year) as (
        SELECT DISTINCT year
        FROM compatibility_matrix
        ORDER BY (year)::numeric DESC
        LIMIT 1
    )
    SELECT
        id,
        option_code,
        option_code_compat,
        year,
        type
    FROM compatibility_matrix
    WHERE
        year in (select year from year)
    AND type IN ('BASECO', 'SUPBAS')
        ${codes ? 'AND option_code = ANY ($1)' : ''}`
    const result = await client.query(query, codes ? [codes] : null)

    logInfo(logger, {
      category: 'database',
      message: 'Get compatibility matrix'
    })

    return result?.rows.map(compatibilityMatrixTransformer)
  } catch (error) {
    logDatabaseError(logger, {
      operation: 'Get compatibility matrix',
      error
    })
    return []
  } finally {
    if (client) {
      client.release()
    }
  }
}

export { getCompatibilityMatrix }

/**
 * @import { CompatibilityMatrix } from '../compatibility-matrix.d.js'
 * @import { Logger } from '~/src/features/common/logger.d.js'
 * @import { Pool } from '~/src/features/common/postgres.d.js'
 */
