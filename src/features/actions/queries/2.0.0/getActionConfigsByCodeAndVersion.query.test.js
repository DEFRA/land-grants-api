import { getActionConfigsByCodeAndVersion } from './getActionConfigsByCodeAndVersion.query.js'
import { vi } from 'vitest'

describe('getActionConfigsByCodeAndVersion', () => {
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
    await getActionConfigsByCodeAndVersion(mockLogger, mockDb, [
      { code: 'UPL1', version: '2.0.0' }
    ])

    expect(mockDb.connect).toHaveBeenCalledTimes(1)
  })

  test('should query with the correct SQL and pass serialised actions as parameter', async () => {
    const actions = [
      { code: 'UPL1', version: '2.0.0' },
      { code: 'CMOR1', version: '3.1.0' }
    ]

    await getActionConfigsByCodeAndVersion(mockLogger, mockDb, actions)

    const expectedQuery = `
      WITH requested AS (
        SELECT
          r->>'code' AS code,
          r->>'version' AS version
        FROM jsonb_array_elements($1::jsonb) AS r
      )
      SELECT DISTINCT ON (a.code)
        a.*,
        ac.version,
        ac.major_version,
        ac.minor_version,
        ac.patch_version,
        ac.config->>'start_date' AS start_date,
        ac.config->>'application_unit_of_measurement' AS application_unit_of_measurement,
        (ac.config->>'duration_years')::numeric AS duration_years,
        ac.config->'payment' AS payment,
        ac.config->'land_cover_class_codes' AS land_cover_class_codes,
        ac.config->'rules' AS rules,
        ac.last_updated_at AS last_updated,
        ac.semantic_version AS semantic_version,
        ac.group_id AS group_id,
        ag.name AS group_name,
        ac.display_order AS display_order
      FROM actions a
      JOIN actions_config ac ON a.code = ac.code
      JOIN requested r ON r.code = a.code
      LEFT OUTER JOIN action_groups ag ON ac.group_id = ag.id
      WHERE (r.version IS NULL OR ac.semantic_version = r.version)
      ORDER BY a.code, ac.major_version DESC, ac.minor_version DESC, ac.patch_version DESC
    `

    expect(mockClient.query).toHaveBeenCalledWith(expectedQuery, [
      JSON.stringify(actions)
    ])
  })

  test('should return the transformed query results', async () => {
    const result = await getActionConfigsByCodeAndVersion(mockLogger, mockDb, [
      { code: 'UPL1', version: '2.0.0' },
      { code: 'CMOR1', version: '3.1.0' }
    ])

    expect(result).toEqual(expectedTransformedResult)
  })

  test('should return the latest version when no version is provided for a code', async () => {
    await getActionConfigsByCodeAndVersion(mockLogger, mockDb, [
      { code: 'CMOR1' }
    ])

    expect(mockClient.query).toHaveBeenCalledWith(expect.any(String), [
      JSON.stringify([{ code: 'CMOR1' }])
    ])
  })

  test('should return empty array when no matching action configs are found', async () => {
    mockResult.rows = []

    const result = await getActionConfigsByCodeAndVersion(mockLogger, mockDb, [
      { code: 'UNKNOWN' }
    ])

    expect(result).toEqual([])
  })

  test('should release the client when done', async () => {
    await getActionConfigsByCodeAndVersion(mockLogger, mockDb, [
      { code: 'UPL1', version: '2.0.0' }
    ])

    expect(mockClient.release).toHaveBeenCalledTimes(1)
  })

  test('should handle errors and return empty array', async () => {
    const error = new Error('Database error')
    mockClient.query = vi.fn().mockRejectedValue(error)

    const result = await getActionConfigsByCodeAndVersion(mockLogger, mockDb, [
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

    const result = await getActionConfigsByCodeAndVersion(mockLogger, mockDb, [
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
