import { getActionBySemanticVersion } from './getActionBySemanticVersion.query.js'
import { vi } from 'vitest'

describe('getActionBySemanticVersion', () => {
  let mockDb
  let mockLogger
  let mockClient
  let mockRow

  beforeEach(() => {
    mockRow = {
      code: 'PA3',
      name: 'Woodland Management Plan',
      description: 'Test WMP action',
      enabled: true,
      start_date: '2024-01-01',
      application_unit_of_measurement: 'ha',
      duration_years: 5,
      payment: { amount: 1500 },
      land_cover_class_codes: ['WOODLAND'],
      rules: { minArea: 0.5 },
      last_updated: '2024-01-15T10:00:00Z',
      version: 2,
      major_version: 1,
      minor_version: 1,
      patch_version: 0,
      semantic_version: '1.1.0',
      group_id: 1,
      group_name: 'Woodland',
      display_order: 1,
      payment_method: {
        name: 'wmp-calculation',
        version: '1.0.0',
        config: { tiers: [] }
      }
    }

    mockClient = {
      query: vi.fn().mockResolvedValue({ rows: [mockRow] }),
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
    await getActionBySemanticVersion(mockLogger, mockDb, 'PA3', '1.1.0')

    expect(mockDb.connect).toHaveBeenCalledTimes(1)
  })

  test('should query with the correct SQL and parameters', async () => {
    await getActionBySemanticVersion(mockLogger, mockDb, 'PA3', '1.1.0')

    const [query, params] = mockClient.query.mock.calls[0]
    expect(query).toContain('WHERE a.enabled = TRUE')
    expect(query).toContain('AND a.code = $1')
    expect(query).toContain('AND ac.semantic_version = $2')
    expect(params).toEqual(['PA3', '1.1.0'])
  })

  test('should return the transformed action config', async () => {
    const result = await getActionBySemanticVersion(
      mockLogger,
      mockDb,
      'PA3',
      '1.1.0'
    )

    expect(result).not.toBeNull()
    expect(result.code).toBe('PA3')
    expect(result.semanticVersion).toBe('1.1.0')
    expect(result.paymentMethod).toEqual({
      name: 'wmp-calculation',
      version: '1.0.0',
      config: { tiers: [] }
    })
  })

  test('should return null when no matching config exists', async () => {
    mockClient.query.mockResolvedValue({ rows: [] })

    const result = await getActionBySemanticVersion(
      mockLogger,
      mockDb,
      'PA3',
      '9.9.9'
    )

    expect(result).toBeNull()
  })

  test('should release the client when done', async () => {
    await getActionBySemanticVersion(mockLogger, mockDb, 'PA3', '1.1.0')

    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should throw and log when the query fails', async () => {
    const error = new Error('Database error')
    mockClient.query = vi.fn().mockRejectedValue(error)

    await expect(
      getActionBySemanticVersion(mockLogger, mockDb, 'PA3', '1.1.0')
    ).rejects.toThrow('Database error')

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: 'Database error' })
      }),
      expect.stringContaining('Get action by semantic version')
    )
    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should release the client when connect fails', async () => {
    const error = new Error('Connection failed')
    mockDb.connect = vi.fn().mockRejectedValue(error)

    await expect(
      getActionBySemanticVersion(mockLogger, mockDb, 'PA3', '1.1.0')
    ).rejects.toThrow('Connection failed')

    expect(mockClient.release).not.toHaveBeenCalled()
  })
})
