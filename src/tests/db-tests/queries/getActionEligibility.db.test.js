import { getActionEligibilty } from '~/src/features/actions/queries/getActionEligibilty.query.js'
import { connectToTestDatbase } from '~/src/tests/db-tests/setup/postgres.js'
import { vi } from 'vitest'

describe('Get Action Eligibility Query', () => {
  let logger, connection

  beforeAll(() => {
    logger = {
      info: vi.fn(),
      error: vi.fn()
    }
    connection = connectToTestDatbase()
  })

  afterAll(async () => {
    await connection.end()
  })

  test('should return all enabled actions', async () => {
    const actions = await getActionEligibilty(logger, connection)

    expect(actions.length).toBeGreaterThan(0)
  })

  test('should return CMOR1', async () => {
    const actions = await getActionEligibilty(logger, connection)

    // eslint-disable-next-line
    const { lastUpdated, id, ...cmor1 } = actions.find(
      (a) => a.code === 'CMOR1'
    )

    expect(cmor1).toEqual({
      id: 1,
      code: 'CMOR1',
      description: 'Assess moorland and produce a written record',
      sssi_eligible: true,
      hefer_eligible: true,
      ingest_id: null,
      last_updated: null
    })
  })
})
