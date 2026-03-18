import { getActionsByVersion } from '~/src/features/actions/queries/2.0.0/getActionsByVersion.query.js'
import { connectToTestDatbase } from '~/src/tests/db-tests/setup/postgres.js'
import { vi } from 'vitest'

describe('Get Action Configs By Version Query', () => {
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

  const expectedActions = {
    CSAM1: '1.0.0',
    OFM3: '1.0.0',
    SAM1: '1.0.0',
    SPM4: '1.0.0',
    CMOR1: '2.0.0',
    UPL1: '3.1.0',
    UPL2: '3.1.0',
    UPL3: '3.1.0',
    UPL8: '1.0.0',
    UPL10: '1.0.0'
  }

  test('should return all actions', async () => {
    const results = await getActionsByVersion(logger, connection, [])
    const expected = Object.fromEntries(
      results.map((r) => [r.code, r.semanticVersion])
    )

    expect(expected).toEqual(expectedActions)
  })

  test('should return actions in display order', async () => {
    const results = await getActionsByVersion(logger, connection, [])
    const resultCodes = results.map((r) => r.code)
    const expectedOrder = Object.keys(expectedActions)

    expect(resultCodes).toEqual(expectedOrder)
  })

  test('should return the correct result for a specified action code and version', async () => {
    const results = await getActionsByVersion(logger, connection, [
      { code: 'CMOR1', version: '1.0.0' }
    ])
    const expected = Object.fromEntries(
      results.map((r) => [r.code, r.semanticVersion])
    )

    const updatedExpected = {
      ...expectedActions,
      CMOR1: '1.0.0'
    }

    expect(expected).toEqual(updatedExpected)
  })

  test('should return the latest version for an action code when no version is provided', async () => {
    const results = await getActionsByVersion(logger, connection, [
      { code: 'CMOR1' }
    ])
    const expected = Object.fromEntries(
      results.map((r) => [r.code, r.semanticVersion])
    )

    expect(expected).toEqual(expectedActions)
  })

  test('should return multiple actions when queried with multiple codes', async () => {
    const results = await getActionsByVersion(logger, connection, [
      { code: 'CMOR1', version: '1.0.0' },
      { code: 'UPL1', version: '2.0.0' },
      { code: 'UPL2' }
    ])
    const expected = Object.fromEntries(
      results.map((r) => [r.code, r.semanticVersion])
    )

    expect(expected).toEqual({
      ...expectedActions,
      CMOR1: '1.0.0',
      UPL1: '2.0.0'
    })
  })

  test('should bump the patch version when major and minor are matched', async () => {
    const results = await getActionsByVersion(logger, connection, [
      { code: 'UPL1', version: '3.1.0' }
    ])
    const expected = Object.fromEntries(
      results.map((r) => [r.code, r.semanticVersion])
    )

    const updatedExpected = {
      ...expectedActions,
      UPL1: '3.1.0'
    }

    expect(expected).toEqual(updatedExpected)
  })

  test('should ignore unknown action codes', async () => {
    const results = await getActionsByVersion(logger, connection, [
      { code: 'UNKNOWN' }
    ])
    const expected = Object.fromEntries(
      results.map((r) => [r.code, r.semanticVersion])
    )

    expect(expected).toEqual(expectedActions)
  })

  test('should ignore non-existent versions', async () => {
    const results = await getActionsByVersion(logger, connection, [
      { code: 'CMOR1', version: '99.0.0' }
    ])
    const expected = Object.fromEntries(
      results
        .filter((r) => r.code !== 'CMOR1')
        .map((r) => [r.code, r.semanticVersion])
    )

    const updatedExpected = Object.fromEntries(
      Object.entries(expectedActions).filter(([code]) => code !== 'CMOR1')
    )

    expect(expected).toEqual(updatedExpected)
  })
})
