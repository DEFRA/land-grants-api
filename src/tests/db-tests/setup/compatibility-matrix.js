// The compatibility matrix is published by the grants-config-broker from grants-config-land-grants,
// so it is not seeded into the test database. Tests that need compatible pairs insert them here,
// tagging the rows with their own source so each test file only removes what it added.

/**
 * Inserts compatible action pairs into compatibility_matrix.
 * @param {import('pg').Pool} connection
 * @param {string} source - stored in updated_by, used by clearCompatibilityMatrix
 * @param {[string, string][]} pairs - [option_code, option_code_compat]
 * @param {{ type?: string, year?: number }} [options]
 */
export const seedCompatibilityMatrix = async (
  connection,
  source,
  pairs,
  { type = 'BASECO', year = 2026 } = {}
) => {
  for (const [optionCode, optionCodeCompat] of pairs) {
    await connection.query(
      `INSERT INTO compatibility_matrix (option_code, option_code_compat, type, year, updated_by)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [optionCode, optionCodeCompat, type, year, source]
    )
  }
}

/**
 * Removes the rows seedCompatibilityMatrix added for a source.
 * @param {import('pg').Pool} connection
 * @param {string} source
 */
export const clearCompatibilityMatrix = async (connection, source) => {
  await connection.query(
    'DELETE FROM compatibility_matrix WHERE updated_by = $1',
    [source]
  )
}
