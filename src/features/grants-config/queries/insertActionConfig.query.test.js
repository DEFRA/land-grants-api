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
    displayOrder: 0
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

  test('executes BEGIN, UPDATE, INSERT and COMMIT in order', async () => {
    await insertActionConfig(mockLogger, mockDb, params)

    const calls = mockClient.query.mock.calls.map((c) =>
      typeof c[0] === 'string' ? c[0].trim() : c[0]
    )
    expect(calls[0]).toBe('BEGIN')
    expect(calls[1]).toContain('UPDATE actions_config SET is_active = FALSE')
    expect(calls[2]).toContain('INSERT INTO actions_config')
    expect(calls[3]).toBe('COMMIT')
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

  test('releases the client after an error', async () => {
    mockClient.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
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
