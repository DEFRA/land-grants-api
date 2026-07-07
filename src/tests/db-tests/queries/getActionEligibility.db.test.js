import { getActionEligibility } from '~/src/features/actions/queries/getActionEligibility.query.js'
import { connectToTestDatabase } from '~/src/tests/db-tests/setup/postgres.js'
import { vi } from 'vitest'

describe('Get Action Eligibility Query', () => {
  let logger, connection

  beforeAll(() => {
    logger = {
      info: vi.fn(),
      error: vi.fn()
    }
    connection = connectToTestDatabase()
  })

  afterAll(async () => {
    await connection.end()
  })

  test('should return all enabled actions', async () => {
    const actions = await getActionEligibility(logger, connection)

    expect(actions.length).toBeGreaterThan(0)
  })

  test('should return CMOR1', async () => {
    const actions = await getActionEligibility(logger, connection)

    // eslint-disable-next-line
    const cmor1 = actions.find((a) => a.code === 'CMOR1')

    expect(cmor1.id).toBe(1)
    expect(cmor1.code).toBe('CMOR1')
    expect(cmor1.description).toBe(
      'Assess moorland and produce a written record'
    )
    expect(cmor1.sssi_eligible).toBe(true)
    expect(cmor1.hf_eligible).toBe(true)
    expect(cmor1.ingest_id).not.toBeNull()
    expect(cmor1.last_updated).not.toBeNull()
  })
})
