import { getSidednessByActionCode } from '~/src/features/actions/queries/getSidednessByActionCode.query.js'
import { connectToTestDatabase } from '~/src/tests/db-tests/setup/postgres.js'

// Codes no migration or other test uses, so their rows can be created and removed freely
const SINGLE_SIDE_CODE = 'SIDEDNESS_SINGLE'
const BOTH_SIDES_CODE = 'SIDEDNESS_BOTH'
const NO_SIDEDNESS_CODE = 'SIDEDNESS_NONE'
const NO_ROW_CODE = 'SIDEDNESS_NO_ROW'
const STORED_CODES = [SINGLE_SIDE_CODE, BOTH_SIDES_CODE, NO_SIDEDNESS_CODE]

describe('Get Action Sidedness Query', () => {
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  let connection

  const deleteStoredCodes = () =>
    connection.query('DELETE FROM actions WHERE code = ANY ($1)', [
      STORED_CODES
    ])

  beforeAll(async () => {
    connection = connectToTestDatabase()
    await deleteStoredCodes()
    await connection.query(
      `INSERT INTO actions (code, sidedness)
       VALUES ($1, 'single-side'), ($2, 'both-sides'), ($3, NULL)`,
      STORED_CODES
    )
  })

  afterAll(async () => {
    await deleteStoredCodes()
    await connection.end()
  })

  test('resolves stored, unset and missing sidedness for every requested code', async () => {
    const sidedness = await getSidednessByActionCode(
      [...STORED_CODES, NO_ROW_CODE],
      connection,
      logger
    )

    expect(sidedness).toEqual({
      [SINGLE_SIDE_CODE]: 'single-side',
      [BOTH_SIDES_CODE]: 'both-sides',
      [NO_SIDEDNESS_CODE]: 'both-sides',
      [NO_ROW_CODE]: 'both-sides'
    })
  })
})
