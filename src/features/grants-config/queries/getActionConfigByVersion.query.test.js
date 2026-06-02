import { getActionConfigByVersion } from './getActionConfigByVersion.query.js'

describe('getActionConfigByVersion', () => {
  let mockDb
  let mockLogger
  let mockClient

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
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

  test('returns true when a matching row exists', async () => {
    mockClient.query.mockResolvedValue({ rows: [{ id: 1 }] })

    const result = await getActionConfigByVersion(
      mockLogger,
      mockDb,
      'PA3',
      '1.0.0'
    )

    expect(result).toBe(true)
  })

  test('returns false when no matching row exists', async () => {
    mockClient.query.mockResolvedValue({ rows: [] })

    const result = await getActionConfigByVersion(
      mockLogger,
      mockDb,
      'PA3',
      '1.0.0'
    )

    expect(result).toBe(false)
  })

  test('queries with the correct SQL and parameters', async () => {
    mockClient.query.mockResolvedValue({ rows: [] })

    await getActionConfigByVersion(mockLogger, mockDb, 'PA3', '1.0.0')

    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT id FROM actions_config WHERE code = $1 AND semantic_version = $2 LIMIT 1',
      ['PA3', '1.0.0']
    )
  })

  test('releases the client after a successful query', async () => {
    mockClient.query.mockResolvedValue({ rows: [] })

    await getActionConfigByVersion(mockLogger, mockDb, 'PA3', '1.0.0')

    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('releases the client after a query error', async () => {
    mockClient.query.mockRejectedValue(new Error('DB error'))

    await getActionConfigByVersion(mockLogger, mockDb, 'PA3', '1.0.0')

    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('returns false and logs error on query failure', async () => {
    const error = new Error('Connection lost')
    mockClient.query.mockRejectedValue(error)

    const result = await getActionConfigByVersion(
      mockLogger,
      mockDb,
      'PA3',
      '1.0.0'
    )

    expect(result).toBe(false)
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'Connection lost' })
      }),
      expect.stringContaining('Database operation failed')
    )
  })

  test('returns false and does not release client on connection error', async () => {
    mockDb.connect.mockRejectedValue(new Error('Cannot connect'))

    const result = await getActionConfigByVersion(
      mockLogger,
      mockDb,
      'PA3',
      '1.0.0'
    )

    expect(result).toBe(false)
    expect(mockClient.release).not.toHaveBeenCalled()
  })
})
