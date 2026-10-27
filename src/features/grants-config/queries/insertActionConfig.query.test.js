import { insertActionConfig } from './insertActionConfig.query.js'

describe('insertActionConfig', () => {
  let mockDb
  let mockLogger
  let mockClient

  const params = {
    code: 'PA3',
    config: {
      start_date: '2025-01-01',
      rules: [],
      guidance_url: 'https://example.com',
      availability: { type: 'total' }
    },
    major: 1,
    minor: 0,
    patch: 0,
    displayOrder: 0,
    description: 'Woodland management plan',
    groupId: null,
    enabled: true,
    display: true
  }

  beforeEach(() => {
    mockClient = {
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
      release: vi.fn()
    }
    mockDb = {
      connect: vi.fn().mockResolvedValue(mockClient)
    }
    mockLogger = {
      info: vi.fn(),
      error: vi.fn()
    }
  })

  test('executes BEGIN, UPDATE actions_config, INSERT and COMMIT in order', async () => {
    await insertActionConfig(mockLogger, mockDb, params)

    const calls = mockClient.query.mock.calls.map((c) =>
      typeof c[0] === 'string' ? c[0].trim() : c[0]
    )
    expect(calls[0]).toBe('BEGIN')
    expect(calls[1]).toContain('UPDATE actions_config')
    expect(calls[2]).toContain('INSERT INTO actions_config')
    expect(calls[3]).toBe('COMMIT')
  })

  test('carries guidanceUrl and availability inside config into actions_config', async () => {
    await insertActionConfig(mockLogger, mockDb, params)

    const insertCall = mockClient.query.mock.calls.find(
      (c) =>
        typeof c[0] === 'string' && c[0].includes('INSERT INTO actions_config')
    )
    expect(insertCall[1][1]).toBe(JSON.stringify(params.config))
  })

  test('rolls back when the code has no actions row', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // UPDATE actions_config
      .mockRejectedValueOnce(
        new Error(
          'insert or update on table "actions_config" violates foreign key constraint "fk_actions_config_code"'
        )
      ) // INSERT actions_config

    const result = await insertActionConfig(mockLogger, mockDb, params)

    const calls = mockClient.query.mock.calls.map((c) => c[0])
    expect(result).toBe(false)
    expect(calls).toContain('ROLLBACK')
    expect(calls).not.toContain('COMMIT')
    expect(mockLogger.error).toHaveBeenCalled()
  })

  test('passes groupId to actions_config insert', async () => {
    await insertActionConfig(mockLogger, mockDb, { ...params, groupId: 3 })

    const insertCall = mockClient.query.mock.calls.find(
      (c) =>
        typeof c[0] === 'string' && c[0].includes('INSERT INTO actions_config')
    )
    expect(insertCall[1][6]).toBe(3)
  })

  test('deactivates existing active config only when new version is higher', async () => {
    await insertActionConfig(mockLogger, mockDb, params)

    const updateCall = mockClient.query.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('UPDATE actions_config')
    )
    expect(updateCall).toBeDefined()
    // WHERE clause guards on major/minor/patch so a lower version never deactivates the active row
    expect(updateCall[0]).toContain('major_version')
    expect(updateCall[0]).toContain('minor_version')
    expect(updateCall[0]).toContain('patch_version')
    expect(updateCall[1]).toEqual(['PA3', 1, 0, 0])
  })

  test('inserts new row with is_active derived from NOT EXISTS subquery', async () => {
    await insertActionConfig(mockLogger, mockDb, params)

    const insertCall = mockClient.query.mock.calls.find(
      (c) =>
        typeof c[0] === 'string' && c[0].includes('INSERT INTO actions_config')
    )
    expect(insertCall[0]).toContain(
      'NOT EXISTS(SELECT 1 FROM actions_config WHERE code = $1 AND is_active = TRUE)'
    )
  })

  test('inserts with correct parameters', async () => {
    await insertActionConfig(mockLogger, mockDb, params)

    const insertCall = mockClient.query.mock.calls.find(
      (c) =>
        typeof c[0] === 'string' && c[0].includes('INSERT INTO actions_config')
    )
    expect(insertCall).toBeDefined()
    const [, insertParams] = insertCall
    expect(insertParams[0]).toBe('PA3')
    expect(insertParams[1]).toBe(JSON.stringify(params.config))
    expect(insertParams[2]).toBe(1) // major
    expect(insertParams[3]).toBe(0) // minor
    expect(insertParams[4]).toBe(0) // patch
    expect(insertParams[5]).toBe(0) // displayOrder
    expect(insertParams[6]).toBeNull() // groupId
    expect(insertParams[7]).toBe('Woodland management plan') // description
  })

  test('inserts the description into the config version row', async () => {
    await insertActionConfig(mockLogger, mockDb, params)

    const insertCall = mockClient.query.mock.calls.find(
      (c) =>
        typeof c[0] === 'string' && c[0].includes('INSERT INTO actions_config')
    )
    const sql = insertCall[0].replaceAll(/\s+/g, ' ')
    expect(sql).toContain('display_order, group_id, description)')
    expect(sql).toContain('$6, $7, $8)')
  })

  test('inserts a null description when the config has none', async () => {
    await insertActionConfig(mockLogger, mockDb, {
      ...params,
      description: null
    })

    const insertCall = mockClient.query.mock.calls.find(
      (c) =>
        typeof c[0] === 'string' && c[0].includes('INSERT INTO actions_config')
    )
    expect(insertCall[1][7]).toBeNull()
  })

  test('returns true on success', async () => {
    const result = await insertActionConfig(mockLogger, mockDb, params)
    expect(result).toBe(true)
  })

  test('releases the client after success', async () => {
    await insertActionConfig(mockLogger, mockDb, params)
    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('rolls back and returns false on INSERT error', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // UPDATE
      .mockRejectedValueOnce(new Error('Insert failed'))

    const result = await insertActionConfig(mockLogger, mockDb, params)

    expect(result).toBe(false)
    const rollbackCall = mockClient.query.mock.calls.find(
      (c) => c[0] === 'ROLLBACK'
    )
    expect(rollbackCall).toBeDefined()
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'Insert failed' })
      }),
      expect.stringContaining('Database operation failed')
    )
  })

  test('rolls back and returns false when the actions_config update fails', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockRejectedValueOnce(new Error('Update failed'))

    const result = await insertActionConfig(mockLogger, mockDb, params)

    expect(result).toBe(false)
    const rollbackCall = mockClient.query.mock.calls.find(
      (c) => c[0] === 'ROLLBACK'
    )
    expect(rollbackCall).toBeDefined()
  })

  test('releases the client after an error', async () => {
    mockClient.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({}) // UPDATE
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({}) // ROLLBACK

    await insertActionConfig(mockLogger, mockDb, params)

    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('returns false and does not release client on connection error', async () => {
    mockDb.connect.mockRejectedValue(new Error('Cannot connect'))

    const result = await insertActionConfig(mockLogger, mockDb, params)

    expect(result).toBe(false)
    expect(mockClient.release).not.toHaveBeenCalled()
  })
})
