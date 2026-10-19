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

  const actionsUpdate = () =>
    mockClient.query.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('UPDATE actions SET')
    )

  test('executes BEGIN, UPDATE actions, UPDATE actions_config, INSERT and COMMIT in order', async () => {
    await insertActionConfig(mockLogger, mockDb, params)

    const calls = mockClient.query.mock.calls.map((c) =>
      typeof c[0] === 'string' ? c[0].trim() : c[0]
    )
    expect(calls[0]).toBe('BEGIN')
    expect(calls[1]).toContain('UPDATE actions SET')
    expect(calls[2]).toContain('UPDATE actions_config')
    expect(calls[3]).toContain('INSERT INTO actions_config')
    expect(calls[4]).toBe('COMMIT')
  })

  test('never inserts an actions row', async () => {
    await insertActionConfig(mockLogger, mockDb, params)

    const sql = mockClient.query.mock.calls.map((c) => c[0]).join('\n')
    expect(sql).not.toMatch(/INSERT INTO actions\s*\(/)
  })

  test('updates enabled, display and description by code', async () => {
    await insertActionConfig(mockLogger, mockDb, params)

    expect(actionsUpdate()[0]).toContain('WHERE code = $1')
    expect(actionsUpdate()[1]).toEqual([
      'PA3',
      true,
      true,
      'Woodland management plan'
    ])
  })

  test('passes enabled and display from params, not hardcoded TRUE', async () => {
    await insertActionConfig(mockLogger, mockDb, {
      ...params,
      enabled: false,
      display: false
    })

    expect(actionsUpdate()[1]).toEqual([
      'PA3',
      false,
      false,
      'Woodland management plan'
    ])
  })

  test('uses COALESCE so null description does not overwrite existing', async () => {
    await insertActionConfig(mockLogger, mockDb, {
      ...params,
      description: null
    })

    expect(actionsUpdate()[0]).toContain('COALESCE($4, description)')
    expect(actionsUpdate()[1]).toEqual(['PA3', true, true, null])
  })

  test('does not update sssi_eligible or hf_eligible', async () => {
    await insertActionConfig(mockLogger, mockDb, params)

    expect(actionsUpdate()[0]).not.toContain('sssi_eligible')
    expect(actionsUpdate()[0]).not.toContain('hf_eligible')
  })

  test('sets last_updated to NOW()', async () => {
    await insertActionConfig(mockLogger, mockDb, params)

    expect(actionsUpdate()[0]).toContain('last_updated = NOW()')
  })

  test('carries guidanceUrl and availability inside config into actions_config, not actions', async () => {
    await insertActionConfig(mockLogger, mockDb, params)

    expect(actionsUpdate()[0]).not.toContain('guidance_url')
    expect(actionsUpdate()[0]).not.toContain('availability')

    const insertCall = mockClient.query.mock.calls.find(
      (c) =>
        typeof c[0] === 'string' && c[0].includes('INSERT INTO actions_config')
    )
    expect(insertCall[1][1]).toBe(JSON.stringify(params.config))
  })

  test('rolls back without inserting a config version when the code has no actions row', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [], rowCount: 0 }) // UPDATE actions

    const result = await insertActionConfig(mockLogger, mockDb, params)

    const calls = mockClient.query.mock.calls.map((c) => c[0])
    expect(result).toBe(false)
    expect(calls).toContain('ROLLBACK')
    expect(calls).not.toContain('COMMIT')
    expect(
      calls.some((sql) => sql.includes('INSERT INTO actions_config'))
    ).toBe(false)
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
      .mockResolvedValueOnce({ rows: [], rowCount: 1 }) // UPDATE actions
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

  test('rolls back and returns false when the actions update fails', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockRejectedValueOnce(new Error('FK violation'))

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
      .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE actions
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
