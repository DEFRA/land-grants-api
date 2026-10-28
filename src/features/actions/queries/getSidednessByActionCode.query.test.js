import { getSidednessByActionCode } from './getSidednessByActionCode.query.js'

describe('getSidednessByActionCode', () => {
  let mockDb
  let mockClient
  let mockLogger

  const givenStoredRows = (rows) => {
    mockClient.query.mockResolvedValue({ rows })
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
      warn: vi.fn(),
      error: vi.fn()
    }
  })

  describe('resolving each code', () => {
    test('returns single-side for a code stored as single-side', async () => {
      givenStoredRows([{ code: 'BND2', sidedness: 'single-side' }])

      const sidedness = await getSidednessByActionCode(
        ['BND2'],
        mockDb,
        mockLogger
      )

      expect(sidedness).toEqual({ BND2: 'single-side' })
    })

    test('returns both-sides for a code stored as both-sides', async () => {
      givenStoredRows([{ code: 'BND1', sidedness: 'both-sides' }])

      const sidedness = await getSidednessByActionCode(
        ['BND1'],
        mockDb,
        mockLogger
      )

      expect(sidedness).toEqual({ BND1: 'both-sides' })
    })

    test('returns both-sides for a code stored with no sidedness', async () => {
      givenStoredRows([{ code: 'CHRW2', sidedness: null }])

      const sidedness = await getSidednessByActionCode(
        ['CHRW2'],
        mockDb,
        mockLogger
      )

      expect(sidedness).toEqual({ CHRW2: 'both-sides' })
    })

    test('returns both-sides for a code with no actions row', async () => {
      givenStoredRows([])

      const sidedness = await getSidednessByActionCode(
        ['HRW1'],
        mockDb,
        mockLogger
      )

      expect(sidedness).toEqual({ HRW1: 'both-sides' })
    })

    test('resolves every requested code in a mixed request', async () => {
      givenStoredRows([
        { code: 'BND1', sidedness: 'both-sides' },
        { code: 'BND2', sidedness: 'single-side' },
        { code: 'CHRW2', sidedness: null }
      ])

      const sidedness = await getSidednessByActionCode(
        ['BND1', 'BND2', 'CHRW2', 'HRW1'],
        mockDb,
        mockLogger
      )

      expect(sidedness).toEqual({
        BND1: 'both-sides',
        BND2: 'single-side',
        CHRW2: 'both-sides',
        HRW1: 'both-sides'
      })
    })
  })

  describe('querying', () => {
    test('looks up all the requested codes in a single query', async () => {
      await getSidednessByActionCode(['BND1', 'BND2'], mockDb, mockLogger)

      expect(mockClient.query).toHaveBeenCalledExactlyOnceWith(
        expect.any(String),
        [['BND1', 'BND2']]
      )
    })

    test('returns no codes when none are requested', async () => {
      const sidedness = await getSidednessByActionCode([], mockDb, mockLogger)

      expect(sidedness).toEqual({})
    })

    test('does not connect when no codes are requested', async () => {
      await getSidednessByActionCode([], mockDb, mockLogger)

      expect(mockDb.connect).not.toHaveBeenCalled()
    })

    test('releases the client after a successful query', async () => {
      await getSidednessByActionCode(['BND1'], mockDb, mockLogger)

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })
  })

  describe('when the database fails', () => {
    test('rejects when the query fails, rather than defaulting to both-sides', async () => {
      mockClient.query.mockRejectedValue(new Error('SELECT failed'))

      await expect(
        getSidednessByActionCode(['BND2'], mockDb, mockLogger)
      ).rejects.toThrow('SELECT failed')
    })

    test('rejects when the connection fails', async () => {
      mockDb.connect.mockRejectedValue(new Error('Connection failed'))

      await expect(
        getSidednessByActionCode(['BND2'], mockDb, mockLogger)
      ).rejects.toThrow('Connection failed')
    })

    test('logs the failure as a database error', async () => {
      mockClient.query.mockRejectedValue(new Error('SELECT failed'))

      await expect(
        getSidednessByActionCode(['BND2'], mockDb, mockLogger)
      ).rejects.toThrow()

      expect(mockLogger.error).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
          error: expect.objectContaining({ message: 'SELECT failed' }),
          event: expect.objectContaining({
            category: 'database',
            action: 'Get action sidedness',
            type: 'error'
          })
        }),
        expect.stringContaining(
          'Database operation failed: Get action sidedness'
        )
      )
    })

    test('releases the client when the query fails', async () => {
      mockClient.query.mockRejectedValue(new Error('SELECT failed'))

      await expect(
        getSidednessByActionCode(['BND2'], mockDb, mockLogger)
      ).rejects.toThrow()

      expect(mockClient.release).toHaveBeenCalledTimes(1)
    })
  })
})
