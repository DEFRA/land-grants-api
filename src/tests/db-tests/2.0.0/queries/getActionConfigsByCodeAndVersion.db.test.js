import { getActionConfigsByCodeAndVersion } from '~/src/features/actions/queries/2.0.0/getActionConfigsByCodeAndVersion.query.js'
import { connectToTestDatbase } from '~/src/tests/db-tests/setup/postgres.js'
import { vi } from 'vitest'

describe('Get Action Configs By Code And Version Query', () => {
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

  test('should return the correct result for a specified action code and version', async () => {
    const [action] = await getActionConfigsByCodeAndVersion(
      logger,
      connection,
      [{ code: 'CMOR1', version: '1.0.0' }]
    )

    expect(action.code).toEqual('CMOR1')
    expect(action.semanticVersion).toEqual('1.0.0')
  })

  test('should return the latest version for an action code when no version is provided', async () => {
    const [action] = await getActionConfigsByCodeAndVersion(
      logger,
      connection,
      [{ code: 'CMOR1' }]
    )

    expect(action.code).toEqual('CMOR1')
    expect(action.semanticVersion).toEqual('2.0.0')
  })

  test('should return multiple actions when queried with multiple codes', async () => {
    const [action1, action2, action3] = await getActionConfigsByCodeAndVersion(
      logger,
      connection,
      [
        { code: 'CMOR1', version: '1.0.0' },
        { code: 'UPL1', version: '2.0.0' },
        { code: 'UPL2' }
      ]
    )

    expect(action1.code).toEqual('CMOR1')
    expect(action1.semanticVersion).toEqual('1.0.0')
    expect(action2.code).toEqual('UPL1')
    expect(action2.semanticVersion).toEqual('2.0.0')
    expect(action3.code).toEqual('UPL2')
    expect(action3.semanticVersion).toEqual('3.1.0')
  })

  test('should return an empty array when queried with an unknown action code', async () => {
    const actions = await getActionConfigsByCodeAndVersion(logger, connection, [
      { code: 'UNKNOWN' }
    ])

    expect(actions).toEqual([])
  })

  test('should return an empty array when queried with a non-existent version', async () => {
    const actions = await getActionConfigsByCodeAndVersion(logger, connection, [
      { code: 'CMOR1', version: '99.0.0' }
    ])

    expect(actions).toEqual([])
  })
})
