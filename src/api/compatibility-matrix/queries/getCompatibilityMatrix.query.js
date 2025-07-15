async function getCompatibilityMatrix(logger, db, codes = null) {
  let client
  try {
    logger.info(`Connecting to DB to fetch compatibility matrix`)
    client = await db.connect()

    if (codes) {
      const query =
        'SELECT * FROM compatibility_matrix WHERE option_code = ANY ($1)'
      const values = [codes]
      const result = await client.query(query, values)

      return result.rows
    }

    const query = 'SELECT * FROM compatibility_matrix'
    const result = await client.query(query)

    return result.rows
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
