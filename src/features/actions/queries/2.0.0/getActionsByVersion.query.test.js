import {
  getActionsByVersion,
  getActionsByVersionSql
} from './getActionsByVersion.query.js'
import { vi } from 'vitest'

describe('getActionsByVersion', () => {
  let mockDb
  let mockLogger
  let mockClient
  let mockResult
  let expectedTransformedResult

  beforeEach(() => {
    mockResult = {
      rows: [
        {
          code: 'UPL1',
          name: 'Upland Action 1',
          description: 'Test upland action',
          enabled: true,
          start_date: '2024-01-01',
          application_unit_of_measurement: 'ha',
          duration_years: 5,
          payment: { amount: 100, unit: 'ha' },
          land_cover_class_codes: ['GRASS', 'ARABLE'],
          rules: { minArea: 0.5 },
          last_updated: '2024-01-15T10:00:00Z',
          version: 2,
          major_version: 2,
          minor_version: 0,
          patch_version: 0,
          semantic_version: '2.0.0',
          group_id: 1,
          group_name: 'Upland',
          display_order: 1
        },
        {
          code: 'CMOR1',
          name: 'Moorland Action 1',
          description: 'Test moorland action',
          enabled: true,
          start_date: '2024-02-01',
          application_unit_of_measurement: 'ha',
          duration_years: 3,
          payment: { amount: 150, unit: 'ha' },
          land_cover_class_codes: ['MOORLAND'],
          rules: { minArea: 1.0 },
          last_updated: '2024-02-10T12:00:00Z',
          version: 3,
          major_version: 3,
          minor_version: 1,
          patch_version: 0,
          semantic_version: '3.1.0',
          group_id: 2,
          group_name: 'Moorland',
          display_order: 2
        }
      ]
    }

    expectedTransformedResult = [
      {
        code: 'UPL1',
        name: 'Upland Action 1',
        description: 'Test upland action',
        enabled: true,
        version: 2,
        majorVersion: 2,
        minorVersion: 0,
        patchVersion: 0,
        applicationUnitOfMeasurement: 'ha',
        durationYears: 5,
        payment: { amount: 100, unit: 'ha' },
        landCoverClassCodes: ['GRASS', 'ARABLE'],
        rules: { minArea: 0.5 },
        startDate: '2024-01-01',
        lastUpdated: '2024-01-15T10:00:00Z',
        semanticVersion: '2.0.0',
        groupId: 1,
        groupName: 'Upland',
        displayOrder: 1
      },
      {
        code: 'CMOR1',
        name: 'Moorland Action 1',
        description: 'Test moorland action',
        enabled: true,
        version: 3,
        majorVersion: 3,
        minorVersion: 1,
        patchVersion: 0,
        applicationUnitOfMeasurement: 'ha',
        durationYears: 3,
        payment: { amount: 150, unit: 'ha' },
        landCoverClassCodes: ['MOORLAND'],
        rules: { minArea: 1.0 },
        startDate: '2024-02-01',
        lastUpdated: '2024-02-10T12:00:00Z',
        semanticVersion: '3.1.0',
        groupId: 2,
        groupName: 'Moorland',
        displayOrder: 2
      }
    ]

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
    await getActionsByVersion(mockLogger, mockDb, [
      { code: 'UPL1', version: '2.0.0' }
    ])

    expect(mockDb.connect).toHaveBeenCalledTimes(1)
  })

  test('should query with the correct SQL and pass serialised actions as parameter', async () => {
    const actions = [
      { code: 'UPL1', version: '2.0.0' },
      { code: 'CMOR1', version: '3.1.0' }
    ]

    await getActionsByVersion(mockLogger, mockDb, actions)

    expect(mockClient.query).toHaveBeenCalledWith(getActionsByVersionSql, [
      JSON.stringify(actions)
    ])
  })

  test('should return all actions including those not in the requested list', async () => {
    mockResult.rows = [
      ...mockResult.rows,
      {
        code: 'OTHER1',
        name: 'Other Action 1',
        description: 'An action not in the requested list',
        enabled: true,
        start_date: '2024-03-01',
        application_unit_of_measurement: 'ha',
        duration_years: 2,
        payment: { amount: 200, unit: 'ha' },
        land_cover_class_codes: ['ARABLE'],
        rules: { minArea: 0.1 },
        last_updated: '2024-03-05T09:00:00Z',
        version: 1,
        major_version: 1,
        minor_version: 0,
        patch_version: 0,
        semantic_version: '1.0.0',
        group_id: 3,
        group_name: 'Other',
        display_order: 3
      }
    ]

    const result = await getActionsByVersion(mockLogger, mockDb, [
      { code: 'UPL1', version: '2.0.0' }
    ])

    expect(result).toHaveLength(3)
    expect(result.map((r) => r.code)).toEqual(['UPL1', 'CMOR1', 'OTHER1'])
  })

  test('should return the transformed query results', async () => {
    const result = await getActionsByVersion(mockLogger, mockDb, [
      { code: 'UPL1', version: '2.0.0' },
      { code: 'CMOR1', version: '3.1.0' }
    ])

    expect(result).toEqual(expectedTransformedResult)
  })

  test('should return the latest version when no version is provided for a code', async () => {
    await getActionsByVersion(mockLogger, mockDb, [{ code: 'CMOR1' }])

    expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
      JSON.stringify([{ code: 'CMOR1' }])
    ])
  })

  test('should return the latest patch version when major and minor are matched', async () => {
    mockResult.rows = [
      {
        code: 'UPL1',
        name: 'Upland Action 1',
        description: 'Test upland action',
        enabled: true,
        start_date: '2024-01-01',
        application_unit_of_measurement: 'ha',
        duration_years: 5,
        payment: { amount: 100, unit: 'ha' },
        land_cover_class_codes: ['GRASS', 'ARABLE'],
        rules: { minArea: 0.5 },
        last_updated: '2024-01-15T10:00:00Z',
        version: 2,
        major_version: 2,
        minor_version: 0,
        patch_version: 3,
        semantic_version: '2.0.3',
        group_id: 1,
        group_name: 'Upland',
        display_order: 1
      }
    ]

    const result = await getActionsByVersion(mockLogger, mockDb, [
      { code: 'UPL1', version: '2.0.0' }
    ])

    expect(result).toHaveLength(1)
    expect(result[0].patchVersion).toBe(3)
    expect(result[0].semanticVersion).toBe('2.0.3')
  })

  test('should return empty array when no matching action configs are found', async () => {
    mockResult.rows = []

    const result = await getActionsByVersion(mockLogger, mockDb, [
      { code: 'UNKNOWN' }
    ])

    expect(result).toEqual([])
  })

  test('should release the client when done', async () => {
    await getActionsByVersion(mockLogger, mockDb, [
      { code: 'UPL1', version: '2.0.0' }
    ])

    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should handle errors and return empty array', async () => {
    const error = new Error('Database error')
    mockClient.query = vi.fn().mockRejectedValue(error)

    const result = await getActionsByVersion(mockLogger, mockDb, [
      { code: 'UPL1', version: '2.0.0' }
    ])

    expect(result).toEqual([])
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Database error'
        })
      }),
      expect.stringContaining(
        'Database operation failed: Get action configs by code and version'
      )
    )

    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should handle database connection error', async () => {
    const connectionError = new Error('Connection failed')
    mockDb.connect = vi.fn().mockRejectedValue(connectionError)

    const result = await getActionsByVersion(mockLogger, mockDb, [
      { code: 'UPL1', version: '2.0.0' }
    ])

    expect(result).toEqual([])
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Connection failed'
        })
      }),
      expect.stringContaining(
        'Database operation failed: Get action configs by code and version'
      )
    )

    expect(mockClient.release).not.toHaveBeenCalled()
  })
})
