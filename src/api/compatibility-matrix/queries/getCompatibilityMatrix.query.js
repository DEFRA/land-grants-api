import { compatibilityMatrixTransformer } from '../compatibility-matrix.transformer.js'

/**
 * @param {object} logger
 * @param {object} db
 * @param {string[]} codes
 * @returns {Promise<CompatibilityMatrix[]>}
 */
async function getCompatibilityMatrix(logger, db, codes = null) {
  let client
  try {
    logger.info(`Connecting to DB to fetch compatibility matrix`)
    client = await db.connect()

    const query = `SELECT * FROM compatibility_matrix ${codes ? 'WHERE option_code = ANY ($1)' : ''}`
    const result = await client.query(query, codes ? [codes] : null)

    return result?.rows.map(compatibilityMatrixTransformer)
  } catch (error) {
    logger.error(
      `Error executing get compatibility matrix query: ${error.message}`
    )
    return
  } finally {
    if (client) {
      client.release()
    }
  }
}

export { getCompatibilityMatrix }

/**
 * @import { CompatibilityMatrix } from '../compatibility-matrix.d.js'
 */
