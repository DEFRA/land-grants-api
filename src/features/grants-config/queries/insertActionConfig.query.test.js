import { insertActionConfig } from './insertActionConfig.query.js'

describe('insertActionConfig', () => {
  let mockDb
  let mockLogger
  let mockClient

  const params = {
    code: 'PA3',
    config: { start_date: '2025-01-01', rules: [] },
    major: 1,
    minor: 0,
    patch: 0,
    displayOrder: 0,
    sssiEligible: true,
    hfEligible: true
  }

  beforeEach(() => {
    mockClient = {
      query: vi.fn().mockResolvedValue({ rows: [] }),
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

  test('executes BEGIN, upsert actions, UPDATE, INSERT and COMMIT in order', async () => {
    await insertActionConfig(mockLogger, mockDb, params)

    const calls = mockClient.query.mock.calls.map((c) =>
      typeof c[0] === 'string' ? c[0].trim() : c[0]
    )
    expect(calls[0]).toBe('BEGIN')
    expect(calls[1]).toContain('INSERT INTO actions')
    expect(calls[2]).toContain('UPDATE actions_config SET is_active = FALSE')
    expect(calls[3]).toContain('INSERT INTO actions_config')
    expect(calls[4]).toBe('COMMIT')
  })

  test('upserts action with sssiEligible and hfEligible from params', async () => {
    await insertActionConfig(mockLogger, mockDb, params)

    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO actions'),
      ['PA3', true, true]
    )
  })

  test('sets sssi_eligible and hf_eligible to false when params are false', async () => {
    await insertActionConfig(mockLogger, mockDb, {
      ...params,
      sssiEligible: false,
      hfEligible: false
    })

    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO actions'),
      ['PA3', false, false]
    )
  })

  test('updates sssi_eligible and hf_eligible on conflict', async () => {
    await insertActionConfig(mockLogger, mockDb, params)

    const upsertCall = mockClient.query.mock.calls.find(
      (c) => typeof c[0] === 'string' && c[0].includes('INSERT INTO actions')
    )
    expect(upsertCall[0]).toContain('ON CONFLICT')
    expect(upsertCall[0]).toContain('sssi_eligible = EXCLUDED.sssi_eligible')
    expect(upsertCall[0]).toContain('hf_eligible = EXCLUDED.hf_eligible')
  })

  test('deactivates existing active config for the same code', async () => {
    await insertActionConfig(mockLogger, mockDb, params)

    expect(mockClient.query).toHaveBeenCalledWith(
      'UPDATE actions_config SET is_active = FALSE WHERE code = $1 AND is_active = TRUE',
      ['PA3']
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
      .mockResolvedValueOnce({ rows: [] }) // INSERT INTO actions (upsert)
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

  test('rolls back and returns false when action upsert fails', async () => {
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
      .mockResolvedValueOnce({}) // INSERT INTO actions (upsert)
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
