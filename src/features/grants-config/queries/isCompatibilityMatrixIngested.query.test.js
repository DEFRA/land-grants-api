import { isCompatibilityMatrixIngested } from './isCompatibilityMatrixIngested.query.js'
import { logDatabaseError } from '~/src/features/common/helpers/logging/log-helpers.js'

vi.mock('~/src/features/common/helpers/logging/log-helpers.js', () => ({
  logDatabaseError: vi.fn()
}))

describe('isCompatibilityMatrixIngested', () => {
  const filename = 'compatibility_matrix_0.1.0.csv'
  let mockDb
  let mockLogger
  let mockClient

  beforeEach(() => {
    vi.clearAllMocks()
    mockClient = {
      query: vi.fn().mockResolvedValue({ rows: [{ ingested: true }] }),
      release: vi.fn()
    }
    mockDb = { connect: vi.fn().mockResolvedValue(mockClient) }
    mockLogger = { info: vi.fn(), error: vi.fn() }
  })

  test('should look up the filename in updated_by', async () => {
    await isCompatibilityMatrixIngested(mockLogger, mockDb, filename)

    expect(mockClient.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE updated_by = $1'),
      [filename]
    )
  })

  test.each([true, false])(
    'should return %s from the query',
    async (ingested) => {
      mockClient.query.mockResolvedValue({ rows: [{ ingested }] })

      expect(
        await isCompatibilityMatrixIngested(mockLogger, mockDb, filename)
      ).toBe(ingested)
    }
  )

  test('should release the client after the query', async () => {
    await isCompatibilityMatrixIngested(mockLogger, mockDb, filename)

    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should log and rethrow database errors', async () => {
    const error = new Error('connection lost')
    mockClient.query.mockRejectedValue(error)

    await expect(
      isCompatibilityMatrixIngested(mockLogger, mockDb, filename)
    ).rejects.toThrow('connection lost')

    expect(logDatabaseError).toHaveBeenCalledWith(mockLogger, {
      operation: 'Check compatibility_matrix ingested',
      error
    })
    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should not release when the connection fails', async () => {
    mockDb.connect.mockRejectedValue(new Error('no connection'))

    await expect(
      isCompatibilityMatrixIngested(mockLogger, mockDb, filename)
    ).rejects.toThrow('no connection')

    expect(mockClient.release).not.toHaveBeenCalled()
  })
})
