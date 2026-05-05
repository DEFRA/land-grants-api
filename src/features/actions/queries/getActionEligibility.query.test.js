import { describe, test, expect, beforeEach, vi } from 'vitest'
import { getActionEligibilty } from './getActionEligibilty.query.js'
import { logDatabaseError } from '~/src/features/common/helpers/logging/log-helpers.js'

vi.mock('~/src/features/common/helpers/logging/log-helpers.js', () => ({
  logDatabaseError: vi.fn()
}))

describe('getActionEligibilty', () => {
  let mockDb
  let mockLogger
  let mockClient
  let mockResult

  beforeEach(() => {
    vi.clearAllMocks()

    mockResult = {
      rows: [
        {
          id: 1,
          code: 'ACT1',
          description: 'Action 1',
          sssi_eligible: true,
          hf_eligible: false,
          ingest_id: 123,
          last_updated: '2024-01-01T00:00:00Z'
        }
      ]
    }

    mockClient = {
      query: vi.fn().mockResolvedValue(mockResult),
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

  test('should connect to the database', async () => {
    await getActionEligibilty(mockLogger, mockDb)

    expect(mockDb.connect).toHaveBeenCalledTimes(1)
  })

  test('should query with the correct SQL', async () => {
    await getActionEligibilty(mockLogger, mockDb)

    const expectedQuery = `
          SELECT
            id,
            code,
            description,
            sssi_eligible,
            hf_eligible,
            ingest_id,
            last_updated
          FROM actions
        `

    expect(mockClient.query).toHaveBeenCalledWith(expectedQuery)
  })

  test('should return the query results', async () => {
    const result = await getActionEligibilty(mockLogger, mockDb)

    expect(result).toEqual(mockResult.rows)
  })

  test('should return empty array when no eligibility data found', async () => {
    mockResult.rows = []

    const result = await getActionEligibilty(mockLogger, mockDb)

    expect(result).toEqual([])
  })

  test('should release the client when done', async () => {
    await getActionEligibilty(mockLogger, mockDb)

    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should handle database query error, log it, and return empty array', async () => {
    const error = new Error('Database query error')
    mockClient.query = vi.fn().mockRejectedValue(error)

    const result = await getActionEligibilty(mockLogger, mockDb)

    expect(result).toEqual([])
    expect(logDatabaseError).toHaveBeenCalledWith(mockLogger, {
      operation: 'Get actions eligibility',
      error
    })
    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should handle database connection error', async () => {
    const connectionError = new Error('Connection failed')
    mockDb.connect = vi.fn().mockRejectedValue(connectionError)

    const result = await getActionEligibilty(mockLogger, mockDb)

    expect(result).toEqual([])
    expect(logDatabaseError).toHaveBeenCalledWith(mockLogger, {
      operation: 'Get actions eligibility',
      error: connectionError
    })
    expect(mockClient.release).not.toHaveBeenCalled()
  })

  test('should handle client release if client is not defined', async () => {
    mockDb.connect = vi.fn().mockRejectedValue(new Error('Connection error'))

    const result = await getActionEligibilty(mockLogger, mockDb)

    expect(result).toEqual([])
    expect(logDatabaseError).toHaveBeenCalled()
    expect(mockClient.release).not.toHaveBeenCalled()
  })
})
