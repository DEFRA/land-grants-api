import { vi } from 'vitest'
import { connectToTestDatbase } from '~/src/tests/db-tests/setup/postgres.js'
import { getActions } from '~/src/features/actions/service/action.service.js'
import { getLatestApplicationRunForAppId } from '~/src/features/application/queries/getLatestApplicationRunForAppId.query.js'

vi.mock(
  '~/src/features/application/queries/getLatestApplicationRunForAppId.query.js'
)

const mockGetLatestApplicationRunForAppId = vi.mocked(
  getLatestApplicationRunForAppId
)

describe('getActions Service (DB)', () => {
  const logger = {
    info: vi.fn(),
    error: vi.fn()
  }

  const mockRequest = { logger }

  let connection

  beforeAll(() => {
    connection = connectToTestDatbase()
  })

  afterAll(async () => {
    await connection.end()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const expectedActions = {
    CSAM1: '1.0.1',
    OFM3: '1.0.0',
    SAM1: '1.0.0',
    SPM4: '1.0.0',
    CMOR1: '2.0.0',
    UPL1: '3.1.0',
    UPL2: '3.1.0',
    UPL3: '3.1.0',
    UPL8: '1.0.0',
    UPL10: '1.0.0',
    PA3: '1.0.0'
  }

  const mockLandActions = [
    {
      sheetId: 'SX0679',
      parcelId: '9238',
      actions: [{ code: 'CMOR1' }, { code: 'UPL1' }]
    }
  ]

  const mockApplicationId = 'APP-123456'

  test('should return all known actions when landActions is empty', async () => {
    mockGetLatestApplicationRunForAppId.mockResolvedValue(null)

    const results = await getActions(
      mockRequest,
      connection,
      [],
      mockApplicationId
    )
    const expected = Object.fromEntries(
      results.map((r) => [r.code, r.semanticVersion])
    )

    expect(expected).toEqual(expectedActions)
  })

  test('should return actions at their latest versions when there is no previous run', async () => {
    mockGetLatestApplicationRunForAppId.mockResolvedValue(null)

    const results = await getActions(
      mockRequest,
      connection,
      mockLandActions,
      mockApplicationId
    )
    const expected = Object.fromEntries(
      results.map((r) => [r.code, r.semanticVersion])
    )

    expect(expected).toEqual(expectedActions)
  })

  test('should pin action versions from a previous run', async () => {
    mockGetLatestApplicationRunForAppId.mockResolvedValue({
      data: {
        parcelLevelResults: [
          {
            actions: [
              { code: 'CMOR1', actionConfigVersion: '1.0.0' },
              { code: 'UPL1', actionConfigVersion: '2.0.0' }
            ]
          }
        ]
      }
    })

    const results = await getActions(
      mockRequest,
      connection,
      mockLandActions,
      mockApplicationId
    )
    const expected = Object.fromEntries(
      results.map((r) => [r.code, r.semanticVersion])
    )

    expect(expected).toEqual({
      ...expectedActions,
      CMOR1: '1.0.0',
      UPL1: '2.0.0'
    })
  })

  test('should use the latest version for actions not present in the previous run', async () => {
    mockGetLatestApplicationRunForAppId.mockResolvedValue({
      data: {
        parcelLevelResults: [
          {
            actions: [{ code: 'CMOR1', actionConfigVersion: '1.0.0' }]
          }
        ]
      }
    })

    const results = await getActions(
      mockRequest,
      connection,
      mockLandActions,
      mockApplicationId
    )
    const expected = Object.fromEntries(
      results.map((r) => [r.code, r.semanticVersion])
    )

    expect(expected).toEqual({ ...expectedActions, CMOR1: '1.0.0' })
  })

  test('should deduplicate actions across parcels, preferring pinned versions', async () => {
    const landActionsWithDuplicates = [
      {
        sheetId: 'SX0679',
        parcelId: '9238',
        actions: [{ code: 'CMOR1' }]
      },
      {
        sheetId: 'SX0680',
        parcelId: '1234',
        actions: [{ code: 'CMOR1' }]
      }
    ]

    mockGetLatestApplicationRunForAppId.mockResolvedValue({
      data: {
        parcelLevelResults: [
          {
            actions: [{ code: 'CMOR1', actionConfigVersion: '1.0.0' }]
          }
        ]
      }
    })

    const results = await getActions(
      mockRequest,
      connection,
      landActionsWithDuplicates,
      mockApplicationId
    )
    const expected = Object.fromEntries(
      results.map((r) => [r.code, r.semanticVersion])
    )

    expect(results.filter((r) => r.code === 'CMOR1')).toHaveLength(1)
    expect(expected).toEqual({ ...expectedActions, CMOR1: '1.0.0' })
  })

  test('should get latest version if application exists but has an empty semanticVersion in the actions data', async () => {
    mockGetLatestApplicationRunForAppId.mockResolvedValue({
      data: {
        parcelLevelResults: [
          {
            actions: [{ code: 'CMOR1', actionConfigVersion: '' }]
          }
        ]
      }
    })

    const results = await getActions(
      mockRequest,
      connection,
      mockLandActions,
      mockApplicationId
    )
    const expected = Object.fromEntries(
      results.map((r) => [r.code, r.semanticVersion])
    )

    expect(expected).toEqual({ ...expectedActions, CMOR1: '2.0.0' })
  })

  test('should bump action version with a patch version 1.0.0 -> 1.0.1', async () => {
    mockGetLatestApplicationRunForAppId.mockResolvedValue({
      data: {
        parcelLevelResults: [
          {
            actions: [{ code: 'CSAM1', actionConfigVersion: '1.0.0' }]
          }
        ]
      }
    })

    const results = await getActions(
      mockRequest,
      connection,
      mockLandActions,
      mockApplicationId
    )
    const expected = Object.fromEntries(
      results.map((r) => [r.code, r.semanticVersion])
    )

    expect(expected).toEqual(expectedActions)
  })
})
