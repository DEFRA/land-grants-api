import {
  BOTH_SIDES,
  SINGLE_SIDE
} from '../../../features/common/constants/sidedness.js'

// Sidedness reaches the actions table from the grants config, which the db seed does not load.
// Written once per run, as test files run in parallel and must not remove rows another is reading.
const TEST_SIDEDNESS = { BND1: BOTH_SIDES, BND2: SINGLE_SIDE }

/**
 * Writes the test sidedness, replacing rows a previous run against the same database left behind.
 * @param {Pool} connection - The test database
 * @returns {Promise<unknown>}
 */
export const insertTestSidedness = async (connection) => {
  const codes = Object.keys(TEST_SIDEDNESS)

  await connection.query('DELETE FROM actions WHERE code = ANY ($1)', [codes])

  return connection.query(
    'INSERT INTO actions (code, sidedness) SELECT * FROM unnest($1::text[], $2::text[])',
    [codes, Object.values(TEST_SIDEDNESS)]
  )
}

/**
 * @import { Pool } from 'pg'
 */
